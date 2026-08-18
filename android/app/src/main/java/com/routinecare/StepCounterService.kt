package com.routinecare

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.*
import android.util.Log
import android.os.Handler
import android.os.Looper
import java.util.Calendar

class StepCounterService : Service(), SensorEventListener {

    companion object {
        const val CHANNEL_ID = "StepCounterServiceChannel"
        const val NOTIFICATION_ID = 1
        private const val ACTION_START_TRACKING = "START_TRACKING"
        private const val ACTION_STOP_TRACKING = "STOP_TRACKING"
        
        fun startService(context: Context) {
            val intent = Intent(context, StepCounterService::class.java)
            intent.action = ACTION_START_TRACKING
            context.startForegroundService(intent)
        }
        
        fun stopService(context: Context) {
            val intent = Intent(context, StepCounterService::class.java)
            intent.action = ACTION_STOP_TRACKING
            context.stopService(intent)
        }
    }

    private var sensorManager: SensorManager? = null
    private var stepCounterSensor: Sensor? = null
    private var accelerometerSensor: Sensor? = null
    private var isTracking = false
    private var stepCount = 0
    private var lastStepCount = 0
    private var initialStepCount = -1
    private lateinit var sharedPrefs: SharedPreferences
    private lateinit var database: StepTrackerDatabase
    private var currentDate = ""
    
    // 자정 타이머
    private val handler = Handler(Looper.getMainLooper())
    private var midnightRunnable: Runnable? = null
    
    // 가속도계 기반 걸음 감지
    private var lastAcceleration = floatArrayOf(0f, 0f, 0f)
    private val threshold = 12.0f
    private val stepLength = 0.762
    private val caloriesPerStep = 0.04

    override fun onCreate() {
        super.onCreate()
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepCounterSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        accelerometerSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        sharedPrefs = getSharedPreferences("StepTracker", Context.MODE_PRIVATE)
        database = StepTrackerDatabase(this)
        
        createNotificationChannel()
        currentDate = getCurrentDateString()
        loadTodaySteps()
        startMidnightTimer() // 자정 타이머 시작
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START_TRACKING -> {
                startStepTracking()
            }
            ACTION_STOP_TRACKING -> {
                stopStepTracking()
                stopSelf()
            }
        }
        return START_STICKY // 서비스가 죽어도 자동으로 재시작
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "걸음수 추적 서비스",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "백그라운드에서 걸음수를 추적합니다"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("걸음수 추적 중")
            .setContentText("오늘 걸음수: $stepCount 걸음")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startStepTracking() {
        if (isTracking) return

        // Step Counter 센서 우선 사용
        if (stepCounterSensor != null) {
            val registered = sensorManager?.registerListener(
                this, 
                stepCounterSensor, 
                SensorManager.SENSOR_DELAY_UI
            )
            if (registered == true) {
                isTracking = true
                startForeground(NOTIFICATION_ID, createNotification())
                return
            }
        }
        
        // Step Counter가 없으면 가속도계 사용
        if (accelerometerSensor != null) {
            val registered = sensorManager?.registerListener(
                this, 
                accelerometerSensor, 
                SensorManager.SENSOR_DELAY_FASTEST
            )
            if (registered == true) {
                isTracking = true
                startForeground(NOTIFICATION_ID, createNotification())
                return
            }
        }
    }

    private fun stopStepTracking() {
        if (!isTracking) return
        
        sensorManager?.unregisterListener(this)
        isTracking = false
        stopForeground(true)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (!isTracking || event == null) return

        when (event.sensor.type) {
            Sensor.TYPE_STEP_COUNTER -> {
                handleStepCounterSensor(event)
            }
            Sensor.TYPE_ACCELEROMETER -> {
                handleAccelerometerSensor(event)
            }
        }
        
        // 알림 업데이트
        updateNotification()
    }

    private fun handleStepCounterSensor(event: SensorEvent) {
        val currentStepCount = event.values[0].toInt()
        
        // 날짜가 바뀌었는지 체크
        val today = getCurrentDateString()
        if (currentDate != today) {
            Log.d("StepCounter", "센서 처리 중 날짜 변경 감지: $currentDate -> $today, 걸음수 초기화")
            stepCount = 0
            initialStepCount = currentStepCount  // 현재 센서 값을 새로운 기준점으로 설정
            currentDate = today
            sharedPrefs.edit().putString("last_date", today).apply()
            
            // DB에 새 날짜 초기값 저장
            database.insertOrUpdateStepData(today, 0, 0.0, 0.0, currentStepCount)
            return
        }
        
        if (initialStepCount == -1) {
            initialStepCount = currentStepCount - stepCount
        }
        
        val newStepCount = currentStepCount - initialStepCount
        if (newStepCount > stepCount) {
            stepCount = newStepCount
            saveTodaySteps()
        }
    }

    private fun handleAccelerometerSensor(event: SensorEvent) {
        val x = event.values[0]
        val y = event.values[1]
        val z = event.values[2]
        
        val acceleration = kotlin.math.sqrt((x * x + y * y + z * z).toDouble()).toFloat()
        val deltaAcceleration = kotlin.math.abs(acceleration - lastAcceleration[0])
        
        if (deltaAcceleration > threshold) {
            stepCount++
            saveTodaySteps()
        }
        
        lastAcceleration[0] = acceleration
    }

    private fun updateNotification() {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(NOTIFICATION_ID, createNotification())
    }

    private fun loadTodaySteps() {
        val today = getCurrentDateString()
        val savedDate = sharedPrefs.getString("last_date", "")
        
        if (savedDate != today) {
            // 저장된 날짜가 오늘이 아니면 0으로 시작
            Log.d("StepCounter", "loadTodaySteps - 날짜 불일치. 저장: $savedDate, 현재: $today -> 0으로 초기화")
            stepCount = 0
            sharedPrefs.edit().apply {
                putString("last_date", today)
                putInt("steps_$today", 0)
                apply()
            }
        } else {
            // 같은 날이면 저장된 값 불러오기
            stepCount = sharedPrefs.getInt("steps_$today", 0)
            Log.d("StepCounter", "loadTodaySteps - 같은 날짜. 저장된 걸음수: $stepCount")
        }
    }

    private fun saveTodaySteps() {
        val today = getCurrentDateString()
        
        // 날짜가 바뀌었으면 걸음수 초기화 (이미 handleStepCounterSensor에서 처리했지만 한번 더 체크)
        if (currentDate != today) {
            Log.d("StepCounter", "saveTodaySteps - 새로운 날짜 감지: $currentDate -> $today")
            currentDate = today
            sharedPrefs.edit().putString("last_date", today).apply()
        }
        
        val editor = sharedPrefs.edit()
        editor.putInt("steps_$today", stepCount)
        editor.apply()
        
        // SQLite에도 저장
        val distance = stepCount * stepLength
        val calories = stepCount * caloriesPerStep
        
        // lastSensorValue는 현재 센서의 실제 값이 아니라 우리가 계산한 stepCount를 저장
        // (나중에 앱이 재시작될 때 참고할 수 있도록)
        database.insertOrUpdateStepData(today, stepCount, calories, distance, stepCount)
    }

    private fun getCurrentDateString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return sdf.format(Date())
    }

    private fun initializeDateAndSteps() {
        val today = getCurrentDateString()
        val savedDate = sharedPrefs.getString("last_date", "")
        
        Log.d("StepCounter", "초기화 - 오늘: $today, 저장된 날짜: $savedDate")
        
        if (savedDate != today) {
            Log.d("StepCounter", "날짜 변경 감지! 걸음수 초기화")
            // 날짜가 바뀌었으므로 걸음수 초기화
            resetDailySteps()
            sharedPrefs.edit().putString("last_date", today).apply()
            currentDate = today
        } else {
            Log.d("StepCounter", "같은 날짜, 걸음수 유지")
            currentDate = today
        }
    }

    private fun checkDateChange() {
        val today = getCurrentDateString()
        if (currentDate != today) {
            Log.d("StepCounter", "실행 중 날짜 변경 감지! $currentDate -> $today")
            // 날짜가 바뀌었으므로 걸음수 초기화
            resetDailySteps()
            sharedPrefs.edit().putString("last_date", today).apply()
            currentDate = today
        }
    }

    private fun resetDailySteps() {
        val today = getCurrentDateString()
        
        stepCount = 0
        lastStepCount = 0
        initialStepCount = -1
        
        // SharedPreferences 정리 - 오늘 날짜의 걸음수도 0으로 초기화
        sharedPrefs.edit().apply {
            putInt("steps_$today", 0)  // 오늘 날짜 키로 0 저장
            putInt("daily_steps", 0)
            putInt("last_step_count", 0)
            putInt("initial_step_count", -1)
            apply()
        }
        
        // 데이터베이스에도 새로운 날의 시작을 기록
        database.insertOrUpdateStepData(today, 0, 0.0, 0.0, 0)
    }

    // 자정 타이머 시작
    private fun startMidnightTimer() {
        scheduleNextMidnightReset()
    }

    // 다음 자정까지의 시간 계산하고 타이머 설정
    private fun scheduleNextMidnightReset() {
        val now = Calendar.getInstance()
        val nextMidnight = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 0)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        
        val delayUntilMidnight = nextMidnight.timeInMillis - now.timeInMillis
        
        Log.d("StepCounter", "자정 타이머 설정: ${delayUntilMidnight / 1000}초 후 초기화")
        
        midnightRunnable = Runnable {
            Log.d("StepCounter", "자정 도달! 걸음수 자동 초기화")
            
            // 걸음수 초기화
            stepCount = 0
            initialStepCount = -1
            currentDate = getCurrentDateString()
            
            // SharedPreferences 업데이트
            val today = getCurrentDateString()
            sharedPrefs.edit().apply {
                putInt("steps_$today", 0)
                putString("last_date", today)
                apply()
            }
            
            // 알림 업데이트
            updateNotification()
            
            // 다음 자정 타이머 설정
            scheduleNextMidnightReset()
        }
        
        handler.postDelayed(midnightRunnable!!, delayUntilMidnight)
    }

    // 타이머 정리
    private fun stopMidnightTimer() {
        midnightRunnable?.let { 
            handler.removeCallbacks(it)
            midnightRunnable = null
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // 정확도 변경 시 처리할 내용 (필요에 따라)
    }

    override fun onDestroy() {
        super.onDestroy()
        stopStepTracking()
        stopMidnightTimer() // 타이머 정리
    }
}
