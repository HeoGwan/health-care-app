package com.routinecare

import android.content.Intent
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.TotalCaloriesBurnedRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.health.connect.client.units.Energy
import androidx.health.connect.client.units.Length
import com.facebook.react.bridge.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

class HealthConnectModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val tag = "HealthConnect"
    private var healthConnectClient: HealthConnectClient? = null
    private val scope = CoroutineScope(Dispatchers.Main)

    override fun getName(): String = "HealthConnectModule"

    private val permissions = setOf(
        HealthPermission.getReadPermission(StepsRecord::class),
        HealthPermission.getReadPermission(DistanceRecord::class),
        HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class)
    )

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            Log.d(tag, "Initializing Health Connect")

            // Health Connect 사용 가능 여부 확인
            val availability = HealthConnectClient.getSdkStatus(reactApplicationContext)

            when (availability) {
                HealthConnectClient.SDK_UNAVAILABLE -> {
                    Log.e(tag, "Health Connect is not available")
                    promise.reject("UNAVAILABLE", "Health Connect is not available on this device")
                    return
                }
                HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                    Log.e(tag, "Health Connect needs update")
                    promise.reject("UPDATE_REQUIRED", "Health Connect app needs to be updated")
                    return
                }
            }

            // Health Connect 클라이언트 초기화
            healthConnectClient = HealthConnectClient.getOrCreate(reactApplicationContext)

            Log.d(tag, "Health Connect initialized successfully")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(tag, "Initialize error: ${e.message}")
            e.printStackTrace()
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        scope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    Log.e(tag, "❌ Client is null")
                    promise.resolve(false)
                    return@launch
                }

                val granted = client.permissionController.getGrantedPermissions()
                Log.d(tag, "🔍 Granted permissions: ${granted.size} out of ${permissions.size}")
                Log.d(tag, "📋 Granted: ${granted.joinToString()}")
                Log.d(tag, "📋 Required: ${permissions.joinToString()}")
                
                val hasAllPermissions = granted.containsAll(permissions)
                Log.d(tag, "✅ Has all permissions: $hasAllPermissions")

                promise.resolve(hasAllPermissions)
            } catch (e: Exception) {
                Log.e(tag, "❌ Check permissions error: ${e.message}")
                promise.reject("CHECK_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        scope.launch {
            try {
                Log.d(tag, "🔐🔐🔐 Requesting Health Connect permissions")

                val activity = reactApplicationContext.currentActivity
                if (activity == null) {
                    promise.reject("NO_ACTIVITY", "Current activity is null")
                    return@launch
                }

                val client = healthConnectClient
                if (client == null) {
                    promise.reject("NOT_INITIALIZED", "Please call initialize() first")
                    return@launch
                }

                // 권한 요청 Contract 생성
                val permissionContract = androidx.health.connect.client.PermissionController.createRequestPermissionResultContract()
                
                // 권한 요청 Intent 생성
                val intent = permissionContract.createIntent(reactApplicationContext, permissions)
                Log.d(tag, "🚀 Launching Health Connect permission screen")
                Log.d(tag, "📋 Requesting permissions: ${permissions.joinToString()}")
                
                // 권한 요청 화면 열기
                activity.startActivityForResult(intent, 1001)
                
                Log.d(tag, "⏳ Permission screen opened. Waiting for user response...")
                
                // TypeScript에서 3초 후 재확인하므로 여기서는 바로 resolve
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(tag, "❌ Request permissions error: ${e.message}")
                e.printStackTrace()
                promise.reject("PERMISSION_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun getMonthlyWalkingData(promise: Promise) {
        Log.d(tag, "Getting monthly walking data from Health Connect")

        scope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    promise.reject("NOT_INITIALIZED", "Please call initialize() first")
                    return@launch
                }

                // 지난 30일 간의 데이터 조회
                val endTime = Instant.now()
                val startTime = endTime.minus(30, ChronoUnit.DAYS)
                val timeRange = TimeRangeFilter.between(startTime, endTime)

                // 날짜별로 데이터 집계
                val dailyData = mutableMapOf<LocalDate, WalkingDataAggregator>()
                val formatter = DateTimeFormatter.ISO_LOCAL_DATE
                val zoneId = ZoneId.systemDefault()

                // 걸음수 데이터 조회
                Log.d(tag, "📊 Reading steps data from $startTime to $endTime")
                val stepsRequest = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = timeRange
                )
                val stepsResponse = client.readRecords(stepsRequest)
                Log.d(tag, "✅ Steps records found: ${stepsResponse.records.size}")

                for (record in stepsResponse.records) {
                    val date = record.startTime.atZone(zoneId).toLocalDate()
                    val agg = dailyData.getOrPut(date) { WalkingDataAggregator() }
                    agg.steps += record.count
                    Log.d(tag, "  📈 $date: +${record.count} steps")
                }

                // 거리 데이터 조회
                Log.d(tag, "📊 Reading distance data")
                val distanceRequest = ReadRecordsRequest(
                    recordType = DistanceRecord::class,
                    timeRangeFilter = timeRange
                )
                val distanceResponse = client.readRecords(distanceRequest)
                Log.d(tag, "✅ Distance records found: ${distanceResponse.records.size}")

                for (record in distanceResponse.records) {
                    val date = record.startTime.atZone(zoneId).toLocalDate()
                    val agg = dailyData.getOrPut(date) { WalkingDataAggregator() }
                    agg.distance += record.distance.inKilometers
                }

                // 칼로리 데이터 조회
                Log.d(tag, "📊 Reading calories data")
                val caloriesRequest = ReadRecordsRequest(
                    recordType = TotalCaloriesBurnedRecord::class,
                    timeRangeFilter = timeRange
                )
                val caloriesResponse = client.readRecords(caloriesRequest)
                Log.d(tag, "✅ Calories records found: ${caloriesResponse.records.size}")

                for (record in caloriesResponse.records) {
                    val date = record.startTime.atZone(zoneId).toLocalDate()
                    val agg = dailyData.getOrPut(date) { WalkingDataAggregator() }
                    agg.calories += record.energy.inKilocalories
                }

                // 결과 배열 생성
                val array = Arguments.createArray()
                val sortedDates = dailyData.keys.sorted()

                var daysWithData = 0
                for (date in sortedDates) {
                    val agg = dailyData[date]!!
                    val data = Arguments.createMap().apply {
                        putString("date", date.format(formatter))
                        putInt("steps", agg.steps.toInt())
                        putDouble("distance", agg.distance)
                        putDouble("calories", agg.calories)
                    }
                    array.pushMap(data)

                    if (agg.steps > 0) {
                        daysWithData++
                        Log.d(tag, "${date.format(formatter)}: ${agg.steps.toInt()} steps")
                    }
                }

                Log.d(tag, "Total days with data: $daysWithData out of ${sortedDates.size}")
                promise.resolve(array)
            } catch (e: Exception) {
                Log.e(tag, "Data read error: ${e.message}")
                e.printStackTrace()
                promise.reject("READ_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun getTodayWalkingData(promise: Promise) {
        Log.d(tag, "Getting today walking data")

        scope.launch {
            try {
                val client = healthConnectClient
                if (client == null) {
                    promise.reject("NOT_INITIALIZED", "Please call initialize() first")
                    return@launch
                }

                // 오늘 데이터 조회
                val today = LocalDate.now()
                val startTime = today.atStartOfDay(ZoneId.systemDefault()).toInstant()
                val endTime = Instant.now()
                val timeRange = TimeRangeFilter.between(startTime, endTime)

                var totalSteps = 0L
                var totalDistance = 0.0
                var totalCalories = 0.0

                // 걸음수
                val stepsRequest = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = timeRange
                )
                val stepsResponse = client.readRecords(stepsRequest)
                for (record in stepsResponse.records) {
                    totalSteps += record.count
                }

                // 거리
                val distanceRequest = ReadRecordsRequest(
                    recordType = DistanceRecord::class,
                    timeRangeFilter = timeRange
                )
                val distanceResponse = client.readRecords(distanceRequest)
                for (record in distanceResponse.records) {
                    totalDistance += record.distance.inKilometers
                }

                // 칼로리
                val caloriesRequest = ReadRecordsRequest(
                    recordType = TotalCaloriesBurnedRecord::class,
                    timeRangeFilter = timeRange
                )
                val caloriesResponse = client.readRecords(caloriesRequest)
                for (record in caloriesResponse.records) {
                    totalCalories += record.energy.inKilocalories
                }

                val result = Arguments.createMap().apply {
                    putString("date", today.format(DateTimeFormatter.ISO_LOCAL_DATE))
                    putInt("steps", totalSteps.toInt())
                    putDouble("distance", totalDistance)
                    putDouble("calories", totalCalories)
                }

                Log.d(tag, "Today data: $totalSteps steps")
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(tag, "Today data read error: ${e.message}")
                promise.reject("READ_ERROR", e.message)
            }
        }
    }

    @ReactMethod
    fun isHealthAppInstalled(promise: Promise) {
        try {
            val availability = HealthConnectClient.getSdkStatus(reactApplicationContext)
            promise.resolve(availability == HealthConnectClient.SDK_AVAILABLE)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openHealthApp(promise: Promise) {
        try {
            val intent = Intent(HealthConnectClient.ACTION_HEALTH_CONNECT_SETTINGS)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkDataSources(promise: Promise) {
        scope.launch {
            try {
                Log.d(tag, "🔍 Checking Health Connect data sources")
                
                val client = healthConnectClient
                if (client == null) {
                    promise.reject("NOT_INITIALIZED", "Please call initialize() first")
                    return@launch
                }

                // 최근 7일 데이터로 테스트
                val endTime = Instant.now()
                val startTime = endTime.minus(7, ChronoUnit.DAYS)
                val timeRange = TimeRangeFilter.between(startTime, endTime)

                // 걸음수 데이터의 메타데이터 확인
                val stepsRequest = ReadRecordsRequest(
                    recordType = StepsRecord::class,
                    timeRangeFilter = timeRange
                )
                val stepsResponse = client.readRecords(stepsRequest)
                
                val sourceApps = mutableSetOf<String>()
                for (record in stepsResponse.records) {
                    val metadata = record.metadata
                    val packageName = metadata.dataOrigin.packageName
                    sourceApps.add(packageName)
                    Log.d(tag, "📱 Found data from: $packageName")
                    Log.d(tag, "  📊 ${record.count} steps at ${record.startTime}")
                }

                val result = Arguments.createMap().apply {
                    putInt("totalRecords", stepsResponse.records.size)
                    val appsArray = Arguments.createArray()
                    sourceApps.forEach { appsArray.pushString(it) }
                    putArray("sourceApps", appsArray)
                    putBoolean("hasSamsungHealth", sourceApps.any { 
                        it.contains("samsung", ignoreCase = true) || 
                        it.contains("shealth", ignoreCase = true) 
                    })
                }

                Log.d(tag, "✅ Found ${stepsResponse.records.size} records from ${sourceApps.size} apps")
                Log.d(tag, "📱 Source apps: ${sourceApps.joinToString()}")
                
                promise.resolve(result)
            } catch (e: Exception) {
                Log.e(tag, "❌ Check data sources error: ${e.message}")
                e.printStackTrace()
                promise.reject("CHECK_ERROR", e.message)
            }
        }
    }

    private data class WalkingDataAggregator(
        var steps: Long = 0,
        var distance: Double = 0.0,
        var calories: Double = 0.0
    )
}
