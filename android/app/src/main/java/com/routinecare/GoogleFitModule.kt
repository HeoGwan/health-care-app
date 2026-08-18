package com.routinecare

import android.app.Activity
import android.content.Intent
import android.util.Log
import com.facebook.react.bridge.*
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInAccount
import com.google.android.gms.fitness.Fitness
import com.google.android.gms.fitness.FitnessOptions
import com.google.android.gms.fitness.data.*
import com.google.android.gms.fitness.request.DataReadRequest
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class GoogleFitModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private val tag = "GoogleFit"
    private var permissionPromise: Promise? = null
    private val GOOGLE_FIT_PERMISSIONS_REQUEST_CODE = 1001

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "GoogleFitModule"
    
    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        Log.d(tag, "📥 onActivityResult: requestCode=$requestCode, resultCode=$resultCode")
        
        if (requestCode == GOOGLE_FIT_PERMISSIONS_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                Log.d(tag, "✅ Permission granted!")
                permissionPromise?.resolve(true)
            } else {
                Log.e(tag, "❌ Permission denied!")
                permissionPromise?.reject("PERMISSION_DENIED", "User denied permissions")
            }
            permissionPromise = null
        }
    }
    
    override fun onNewIntent(intent: Intent) {
        // Not used
    }

    private val fitnessOptions = FitnessOptions.builder()
        .addDataType(DataType.TYPE_STEP_COUNT_DELTA, FitnessOptions.ACCESS_READ)
        .addDataType(DataType.TYPE_DISTANCE_DELTA, FitnessOptions.ACCESS_READ)
        .addDataType(DataType.TYPE_CALORIES_EXPENDED, FitnessOptions.ACCESS_READ)
        .build()

    private fun getGoogleAccount(): GoogleSignInAccount {
        // 먼저 이미 로그인된 계정 확인
        val existingAccount = GoogleSignIn.getLastSignedInAccount(reactApplicationContext)
        if (existingAccount != null) {
            Log.d(tag, "✅ Using existing signed-in account: ${existingAccount.email}")
            return existingAccount
        }
        
        // 없으면 getAccountForExtension 사용 (디바이스의 Google 계정)
        val account = GoogleSignIn.getAccountForExtension(reactApplicationContext, fitnessOptions)
        Log.d(tag, "✅ Using account for extension: ${account.email}")
        return account
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            Log.d(tag, "Checking Google Fit permissions")

            val account = getGoogleAccount()

            if (!GoogleSignIn.hasPermissions(account, fitnessOptions)) {
                Log.d(tag, "Permissions not granted - need to request")
                promise.resolve(false)
            } else {
                Log.d(tag, "Permissions already granted")
                promise.resolve(true)
            }
        } catch (e: Exception) {
            Log.e(tag, "Initialize error: ${e.message}")
            e.printStackTrace()
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            val account = getGoogleAccount()
            val hasPermissions = GoogleSignIn.hasPermissions(account, fitnessOptions)
            promise.resolve(hasPermissions)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            Log.d(tag, "🔐🔐🔐 Requesting Google Fit permissions")

            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                Log.e(tag, "❌ Current activity is null")
                promise.reject("NO_ACTIVITY", "Current activity is null")
                return
            }

            val account = getGoogleAccount()
            Log.d(tag, "📱 Account: ${account.email}")
            
            // 권한이 이미 있는지 먼저 확인
            if (GoogleSignIn.hasPermissions(account, fitnessOptions)) {
                Log.d(tag, "✅ Permissions already granted!")
                promise.resolve(true)
                return
            }
            
            // Promise를 저장하여 onActivityResult에서 사용
            permissionPromise = promise
            
            // 권한 요청 - Activity Result로 결과를 받음
            Log.d(tag, "🚀 Opening Google Fit permission screen...")
            GoogleSignIn.requestPermissions(
                activity,
                GOOGLE_FIT_PERMISSIONS_REQUEST_CODE,
                account,
                fitnessOptions
            )
            Log.d(tag, "⏳ Permission dialog opened. Waiting for user response...")
        } catch (e: Exception) {
            Log.e(tag, "❌ Request permissions error: ${e.message}")
            e.printStackTrace()
            permissionPromise = null
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getMonthlyWalkingData(promise: Promise) {
        Log.d(tag, "Getting monthly walking data from Google Fit")

        try {
            val account = getGoogleAccount()

            if (!GoogleSignIn.hasPermissions(account, fitnessOptions)) {
                Log.e(tag, "Google Fit permission not granted")
                promise.reject("NO_PERMISSION", "Google Fit permission required. Please grant permissions first.")
                return
            }

            val endCal = Calendar.getInstance()
            val startCal = Calendar.getInstance()
            startCal.add(Calendar.DAY_OF_MONTH, -30)

            val logSdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
            Log.d(tag, "Query period: ${logSdf.format(startCal.time)} to ${logSdf.format(endCal.time)}")

            val request = DataReadRequest.Builder()
                .aggregate(DataType.TYPE_STEP_COUNT_DELTA)
                .aggregate(DataType.TYPE_DISTANCE_DELTA)
                .aggregate(DataType.TYPE_CALORIES_EXPENDED)
                .bucketByTime(1, TimeUnit.DAYS)
                .setTimeRange(startCal.timeInMillis, endCal.timeInMillis, TimeUnit.MILLISECONDS)
                .build()

            Fitness.getHistoryClient(reactApplicationContext, account)
                .readData(request)
                .addOnSuccessListener { response ->
                    try {
                        val array = Arguments.createArray()
                        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                        var daysWithData = 0

                        Log.d(tag, "Data buckets received: ${response.buckets.size}")

                        for (bucket in response.buckets) {
                            val data = Arguments.createMap()
                            val dateStr = sdf.format(bucket.getStartTime(TimeUnit.MILLISECONDS))
                            data.putString("date", dateStr)

                            var steps = 0
                            var distance = 0f
                            var calories = 0f

                            for (dataSet in bucket.dataSets) {
                                for (dp in dataSet.dataPoints) {
                                    when (dp.dataType) {
                                        DataType.TYPE_STEP_COUNT_DELTA -> {
                                            steps += dp.getValue(Field.FIELD_STEPS).asInt()
                                        }
                                        DataType.TYPE_DISTANCE_DELTA -> {
                                            distance += dp.getValue(Field.FIELD_DISTANCE).asFloat()
                                        }
                                        DataType.TYPE_CALORIES_EXPENDED -> {
                                            calories += dp.getValue(Field.FIELD_CALORIES).asFloat()
                                        }
                                    }
                                }
                            }

                            data.putInt("steps", steps)
                            data.putDouble("distance", (distance / 1000.0))
                            data.putDouble("calories", calories.toDouble())
                            array.pushMap(data)

                            if (steps > 0) {
                                daysWithData++
                                Log.d(tag, "$dateStr: $steps steps")
                            }
                        }

                        Log.d(tag, "Total days with data: $daysWithData out of ${response.buckets.size}")
                        Log.d(tag, "Monthly data query complete! Array size: ${array.size()}")
                        promise.resolve(array)
                    } catch (e: Exception) {
                        Log.e(tag, "Data processing error: ${e.message}")
                        e.printStackTrace()
                        promise.reject("DATA_ERROR", e.message)
                    }
                }
                .addOnFailureListener { e ->
                    Log.e(tag, "Google Fit data read failed: ${e.message}")
                    e.printStackTrace()
                    promise.reject("READ_ERROR", e.message)
                }
        } catch (e: Exception) {
            Log.e(tag, "getMonthlyWalkingData error: ${e.message}")
            e.printStackTrace()
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun getTodayWalkingData(promise: Promise) {
        Log.d(tag, "Getting today walking data")

        try {
            val account = getGoogleAccount()

            if (!GoogleSignIn.hasPermissions(account, fitnessOptions)) {
                Log.e(tag, "Google Fit permission not granted")
                promise.reject("NO_PERMISSION", "Google Fit permission required")
                return
            }

            val startCal = Calendar.getInstance()
            startCal.set(Calendar.HOUR_OF_DAY, 0)
            startCal.set(Calendar.MINUTE, 0)
            startCal.set(Calendar.SECOND, 0)

            val endCal = Calendar.getInstance()

            val request = DataReadRequest.Builder()
                .aggregate(DataType.TYPE_STEP_COUNT_DELTA)
                .aggregate(DataType.TYPE_DISTANCE_DELTA)
                .aggregate(DataType.TYPE_CALORIES_EXPENDED)
                .bucketByTime(1, TimeUnit.DAYS)
                .setTimeRange(startCal.timeInMillis, endCal.timeInMillis, TimeUnit.MILLISECONDS)
                .build()

            Fitness.getHistoryClient(reactApplicationContext, account)
                .readData(request)
                .addOnSuccessListener { response ->
                    try {
                        var steps = 0
                        var distance = 0f
                        var calories = 0f

                        for (bucket in response.buckets) {
                            for (dataSet in bucket.dataSets) {
                                for (dp in dataSet.dataPoints) {
                                    when (dp.dataType) {
                                        DataType.TYPE_STEP_COUNT_DELTA -> {
                                            steps += dp.getValue(Field.FIELD_STEPS).asInt()
                                        }
                                        DataType.TYPE_DISTANCE_DELTA -> {
                                            distance += dp.getValue(Field.FIELD_DISTANCE).asFloat()
                                        }
                                        DataType.TYPE_CALORIES_EXPENDED -> {
                                            calories += dp.getValue(Field.FIELD_CALORIES).asFloat()
                                        }
                                    }
                                }
                            }
                        }

                        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                        val result = Arguments.createMap()
                        result.putString("date", sdf.format(startCal.time))
                        result.putInt("steps", steps)
                        result.putDouble("distance", (distance / 1000.0))
                        result.putDouble("calories", calories.toDouble())

                        Log.d(tag, "Today data: $steps steps")
                        promise.resolve(result)
                    } catch (e: Exception) {
                        promise.reject("DATA_ERROR", e.message)
                    }
                }
                .addOnFailureListener { e ->
                    Log.e(tag, "Today data read failed: ${e.message}")
                    promise.reject("READ_ERROR", e.message)
                }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isHealthAppInstalled(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            pm.getPackageInfo("com.sec.android.app.shealth", 0)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openHealthApp(promise: Promise) {
        try {
            val intent = reactApplicationContext.packageManager
                .getLaunchIntentForPackage("com.sec.android.app.shealth")
            if (intent != null) {
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
