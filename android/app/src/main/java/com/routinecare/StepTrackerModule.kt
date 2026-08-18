package com.routinecare

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import android.hardware.Sensor
import android.hardware.SensorManager
import android.content.Context
import android.content.SharedPreferences
import java.text.SimpleDateFormat
import java.util.*

class StepTrackerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var sensorManager: SensorManager? = null
    private var stepCounterSensor: Sensor? = null
    private var accelerometerSensor: Sensor? = null
    private var isTracking = false
    private val sharedPrefs: SharedPreferences = reactContext.getSharedPreferences("StepTracker", Context.MODE_PRIVATE)
    
    // SQLite 데이터베이스 (StepCounterService가 저장한 데이터를 읽기만 함)
    private val database: StepTrackerDatabase = StepTrackerDatabase(reactContext)
    
    init {
        sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepCounterSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        accelerometerSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
    }

    override fun getName(): String {
        return "StepTrackerModule"
    }

    @ReactMethod
    fun initializeTracker(promise: Promise) {
        try {
            // 센서 초기화
            sensorManager = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            stepCounterSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
            accelerometerSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            
            // 센서 상세 정보 확인
            val allSensors = sensorManager?.getSensorList(Sensor.TYPE_ALL) ?: emptyList()
            val stepCounterSensors = sensorManager?.getSensorList(Sensor.TYPE_STEP_COUNTER) ?: emptyList()
            val accelerometerSensors = sensorManager?.getSensorList(Sensor.TYPE_ACCELEROMETER) ?: emptyList()
            
            val result = Arguments.createMap()
            result.putBoolean("success", true)
            result.putString("message", "StepTracker initialized successfully")
            result.putBoolean("hasStepCounter", stepCounterSensor != null)
            result.putBoolean("hasAccelerometer", accelerometerSensor != null)
            result.putInt("totalSensors", allSensors.size)
            result.putInt("stepCounterSensors", stepCounterSensors.size)
            result.putInt("accelerometerSensors", accelerometerSensors.size)
            
            // 디버깅 정보 추가
            if (stepCounterSensor != null) {
                result.putString("stepCounterName", stepCounterSensor!!.name)
                result.putString("stepCounterVendor", stepCounterSensor!!.vendor)
            }
            if (accelerometerSensor != null) {
                result.putString("accelerometerName", accelerometerSensor!!.name)
                result.putString("accelerometerVendor", accelerometerSensor!!.vendor)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", "Failed to initialize StepTracker: ${e.message}")
        }
    }

    @ReactMethod
    fun getSensorStatus(promise: Promise) {
        try {
            val result = Arguments.createMap()
            
            // 센서 매니저 확인
            if (sensorManager == null) {
                sensorManager = reactApplicationContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
            }
            
            // 모든 센서 목록 가져오기
            val allSensors = sensorManager?.getSensorList(Sensor.TYPE_ALL) ?: emptyList()
            val stepCounterSensors = sensorManager?.getSensorList(Sensor.TYPE_STEP_COUNTER) ?: emptyList()
            val accelerometerSensors = sensorManager?.getSensorList(Sensor.TYPE_ACCELEROMETER) ?: emptyList()
            
            // 기본 센서 확인
            val defaultStepCounter = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
            val defaultAccelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
            
            result.putBoolean("sensorManagerAvailable", sensorManager != null)
            result.putInt("totalSensors", allSensors.size)
            result.putInt("stepCounterSensors", stepCounterSensors.size)
            result.putInt("accelerometerSensors", accelerometerSensors.size)
            result.putBoolean("hasDefaultStepCounter", defaultStepCounter != null)
            result.putBoolean("hasDefaultAccelerometer", defaultAccelerometer != null)
            result.putBoolean("isTracking", isTracking)
            
            // 센서 세부 정보
            if (defaultStepCounter != null) {
                val stepCounterInfo = Arguments.createMap()
                stepCounterInfo.putString("name", defaultStepCounter.name)
                stepCounterInfo.putString("vendor", defaultStepCounter.vendor)
                stepCounterInfo.putInt("type", defaultStepCounter.type)
                stepCounterInfo.putDouble("maxRange", defaultStepCounter.maximumRange.toDouble())
                stepCounterInfo.putDouble("resolution", defaultStepCounter.resolution.toDouble())
                stepCounterInfo.putDouble("power", defaultStepCounter.power.toDouble())
                result.putMap("stepCounterInfo", stepCounterInfo)
            }
            
            if (defaultAccelerometer != null) {
                val accelerometerInfo = Arguments.createMap()
                accelerometerInfo.putString("name", defaultAccelerometer.name)
                accelerometerInfo.putString("vendor", defaultAccelerometer.vendor)
                accelerometerInfo.putInt("type", defaultAccelerometer.type)
                accelerometerInfo.putDouble("maxRange", defaultAccelerometer.maximumRange.toDouble())
                accelerometerInfo.putDouble("resolution", defaultAccelerometer.resolution.toDouble())
                accelerometerInfo.putDouble("power", defaultAccelerometer.power.toDouble())
                result.putMap("accelerometerInfo", accelerometerInfo)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get sensor status: ${e.message}")
        }
    }

    @ReactMethod
    fun startTracking(promise: Promise) {
        try {
            if (isTracking) {
                promise.resolve(createResponse(true, "Already tracking"))
                return
            }

            // StepCounterService만 시작 (중복 센서 등록 방지)
            StepCounterService.startService(reactApplicationContext)
            isTracking = true
            
            promise.resolve(createResponse(true, "Background service tracking started"))
        } catch (e: Exception) {
            promise.resolve(createResponse(false, "Error: ${e.message}"))
        }
    }

    @ReactMethod
    fun stopTracking(promise: Promise) {
        try {
            if (!isTracking) {
                promise.resolve(createResponse(true, "Not tracking"))
                return
            }

            // StepCounterService 중지
            StepCounterService.stopService(reactApplicationContext)
            isTracking = false
            
            promise.resolve(createResponse(true, "Tracking stopped"))
        } catch (e: Exception) {
            promise.resolve(createResponse(false, "Error: ${e.message}"))
        }
    }

    @ReactMethod
    fun getTodayData(promise: Promise) {
        try {
            val today = getCurrentDate()
            
            // StepCounterService가 저장한 DB 데이터 조회
            val stepData = database.getStepData(today)
            
            val result = Arguments.createMap()
            if (stepData != null) {
                result.putInt("steps", stepData.steps)
                result.putDouble("calories", stepData.calories)
                result.putDouble("distance", stepData.distance)
                result.putInt("lastSensorValue", stepData.lastSensorValue)
            } else {
                // DB에 데이터가 없으면 0 반환
                result.putInt("steps", 0)
                result.putDouble("calories", 0.0)
                result.putDouble("distance", 0.0)
                result.putInt("lastSensorValue", 0)
            }
            result.putString("date", today)
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun resetTodayData(promise: Promise) {
        try {
            // DB에서 오늘 데이터 삭제
            val today = getCurrentDate()
            database.deleteStepData(today)
            
            promise.resolve(createResponse(true, "Data reset"))
        } catch (e: Exception) {
            promise.resolve(createResponse(false, "Error: ${e.message}"))
        }
    }

    // SQLite 데이터 확인용 디버깅 메서드 추가
    @ReactMethod
    fun getAllDatabaseData(promise: Promise) {
        try {
            val allData = database.getAllStepData()
            val result = Arguments.createArray()
            
            for (stepData in allData) {
                val dayData = Arguments.createMap()
                dayData.putString("date", stepData.date)
                dayData.putInt("steps", stepData.steps)
                dayData.putDouble("calories", stepData.calories)
                dayData.putDouble("distance", stepData.distance)
                dayData.putInt("lastSensorValue", stepData.lastSensorValue)
                result.pushMap(dayData)
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get database data: ${e.message}")
        }
    }

    @ReactMethod
    fun getDataByDate(date: String, promise: Promise) {
        try {
            // SQLite에서 데이터 우선 조회
            val stepData = database.getStepData(date)
            
            val result = Arguments.createMap()
            if (stepData != null) {
                // SQLite에 데이터가 있으면 SQLite 데이터 사용
                result.putInt("steps", stepData.steps)
                result.putDouble("calories", stepData.calories)
                result.putDouble("distance", stepData.distance)
                result.putInt("lastSensorValue", stepData.lastSensorValue)
            } else {
                // SQLite에 데이터가 없으면 0 반환
                result.putInt("steps", 0)
                result.putDouble("calories", 0.0)
                result.putDouble("distance", 0.0)
                result.putInt("lastSensorValue", 0)
            }
            result.putString("date", date)
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getDataByDateRange(startDate: String, endDate: String, promise: Promise) {
        try {
            val result = Arguments.createArray()
            val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            val start = dateFormat.parse(startDate)
            val end = dateFormat.parse(endDate)
            
            if (start != null && end != null) {
                val calendar = Calendar.getInstance()
                calendar.time = start
                
                while (calendar.time <= end) {
                    val currentDate = dateFormat.format(calendar.time)
                    
                    // DB에서 데이터 조회
                    val stepData = database.getStepData(currentDate)
                    val dayData = Arguments.createMap()
                    
                    if (stepData != null) {
                        dayData.putInt("steps", stepData.steps)
                        dayData.putDouble("calories", stepData.calories)
                        dayData.putDouble("distance", stepData.distance)
                    } else {
                        dayData.putInt("steps", 0)
                        dayData.putDouble("calories", 0.0)
                        dayData.putDouble("distance", 0.0)
                    }
                    dayData.putString("date", currentDate)
                    
                    result.pushMap(dayData)
                    calendar.add(Calendar.DAY_OF_MONTH, 1)
                }
            }
            
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }



    private fun getCurrentDate(): String {
        val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return formatter.format(Date())
    }

    private fun createResponse(success: Boolean, message: String): WritableMap {
        val result = Arguments.createMap()
        result.putBoolean("success", success)
        result.putString("message", message)
        return result
    }
}
