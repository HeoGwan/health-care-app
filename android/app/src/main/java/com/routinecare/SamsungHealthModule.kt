package com.routinecare

import com.facebook.react.bridge.*

/**
 * SamsungHealthModule - Health Connect Wrapper
 * 
 * Health Connect API를 통해 삼성 헬스 데이터 조회
 * Google Fit API는 2026년 지원 중단 예정으로 Health Connect만 사용
 */
class SamsungHealthModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SamsungHealthModule"
    }

    private val healthConnectModule = HealthConnectModule(reactContext)

    override fun getName(): String = "SamsungHealthModule"

    @ReactMethod
    fun initialize(promise: Promise) {
        try {
            android.util.Log.d(TAG, "🔄 Using Health Connect (Google Fit deprecated in 2026)")
            healthConnectModule.initialize(promise)
        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Initialize error: ${e.message}")
            promise.reject("INIT_ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkPermissions(promise: Promise) {
        try {
            healthConnectModule.checkPermissions(promise)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestPermissions(promise: Promise) {
        try {
            healthConnectModule.requestPermissions(promise)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getMonthlyWalkingData(promise: Promise) {
        try {
            healthConnectModule.getMonthlyWalkingData(promise)
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getTodayWalkingData(promise: Promise) {
        try {
            healthConnectModule.getTodayWalkingData(promise)
        } catch (e: Exception) {
            promise.reject("READ_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isHealthAppInstalled(promise: Promise) {
        try {
            healthConnectModule.isHealthAppInstalled(promise)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }

    @ReactMethod
    fun openHealthApp(promise: Promise) {
        try {
            healthConnectModule.openHealthApp(promise)
        } catch (e: Exception) {
            promise.reject("OPEN_ERROR", e.message)
        }
    }

    @ReactMethod
    fun checkDataSources(promise: Promise) {
        try {
            healthConnectModule.checkDataSources(promise)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message)
        }
    }

    /**
     * Samsung Health -> Health Connect 동기화 가이드 표시
     */
    @ReactMethod
    fun showSyncGuide(promise: Promise) {
        try {
            val guide = Arguments.createMap().apply {
                putString("title", "삼성 헬스 데이터 동기화")
                putString("message", """
                    Health Connect에 데이터가 없습니다.
                    
                    삼성 헬스 앱에서 Health Connect로 데이터 동기화를 활성화해주세요.
                """.trimIndent())
                
                val steps = Arguments.createArray()
                listOf(
                    mapOf("step" to 1, "title" to "삼성 헬스 앱 열기", "description" to "홈 화면에서 삼성 헬스 앱을 실행합니다", "icon" to "app"),
                    mapOf("step" to 2, "title" to "프로필 탭으로 이동", "description" to "화면 오른쪽 하단의 프로필 아이콘을 탭합니다", "icon" to "person"),
                    mapOf("step" to 3, "title" to "설정 열기", "description" to "오른쪽 상단의 톱니바퀴 아이콘(설정)을 탭합니다", "icon" to "settings"),
                    mapOf("step" to 4, "title" to "데이터 권한 선택", "description" to "'데이터 권한' 또는 'Health Connect' 메뉴를 찾아 탭합니다", "icon" to "security"),
                    mapOf("step" to 5, "title" to "동기화 활성화", "description" to "'Health Connect에 데이터 동기화' 스위치를 켭니다", "icon" to "sync"),
                    mapOf("step" to 6, "title" to "데이터 유형 선택", "description" to "걸음 수, 거리, 칼로리 소모량 등을 선택합니다", "icon" to "checklist"),
                    mapOf("step" to 7, "title" to "앱 재시작", "description" to "동기화가 완료되면 이 앱을 다시 시작합니다", "icon" to "refresh")
                ).forEach { stepData ->
                    steps.pushMap(Arguments.createMap().apply {
                        putInt("step", stepData["step"] as Int)
                        putString("title", stepData["title"] as String)
                        putString("description", stepData["description"] as String)
                        putString("icon", stepData["icon"] as String)
                    })
                }
                putArray("steps", steps)
                
                val troubleshooting = Arguments.createArray()
                listOf(
                    "Health Connect가 설치되어 있는지 확인하세요 (Android 14 이상 기본 포함)",
                    "삼성 헬스 앱이 최신 버전인지 확인하세요",
                    "동기화 설정 후 최소 1~2분 기다려주세요",
                    "삼성 헬스에 실제 데이터가 있는지 확인하세요"
                ).forEach { troubleshooting.pushString(it) }
                putArray("troubleshooting", troubleshooting)
            }
            
            android.util.Log.d(TAG, "📖 Showing Samsung Health sync guide")
            promise.resolve(guide)
        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Error showing sync guide: ${e.message}")
            promise.reject("GUIDE_ERROR", e.message)
        }
    }

    /**
     * Health Connect 앱 설정 화면으로 이동
     */
    @ReactMethod
    fun openHealthConnectSettings(promise: Promise) {
        try {
            val intent = android.content.Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
            intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
            
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.startActivity(intent)
                android.util.Log.d(TAG, "✅ Opened Health Connect settings")
                promise.resolve(true)
            } else {
                reactApplicationContext.startActivity(intent)
                android.util.Log.d(TAG, "✅ Opened Health Connect settings (from context)")
                promise.resolve(true)
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Failed to open Health Connect settings: ${e.message}")
            try {
                val playStoreIntent = android.content.Intent(
                    android.content.Intent.ACTION_VIEW,
                    android.net.Uri.parse("market://details?id=com.google.android.apps.healthdata")
                )
                playStoreIntent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(playStoreIntent)
                promise.resolve(false)
            } catch (e2: Exception) {
                promise.reject("OPEN_SETTINGS_ERROR", "Health Connect is not available")
            }
        }
    }

    /**
     * Samsung Health 앱 설정 화면으로 바로 이동
     */
    @ReactMethod
    fun openSamsungHealthSettings(promise: Promise) {
        try {
            val intent = reactApplicationContext.packageManager.getLaunchIntentForPackage("com.sec.android.app.shealth")
            if (intent != null) {
                intent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                reactApplicationContext.startActivity(intent)
                android.util.Log.d(TAG, "✅ Opened Samsung Health app")
                promise.resolve(true)
            } else {
                android.util.Log.e(TAG, "❌ Samsung Health app not found")
                promise.reject("APP_NOT_FOUND", "Samsung Health app is not installed")
            }
        } catch (e: Exception) {
            android.util.Log.e(TAG, "❌ Failed to open Samsung Health: ${e.message}")
            promise.reject("OPEN_APP_ERROR", e.message)
        }
    }
}
