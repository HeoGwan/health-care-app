package com.routinecare

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class StepTrackerDatabase(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "StepTracker.db"
        private const val DATABASE_VERSION = 1
        
        // 테이블 이름
        private const val TABLE_DAILY_STEPS = "daily_steps"
        
        // 컬럼 이름들
        private const val COLUMN_ID = "id"
        private const val COLUMN_DATE = "date"
        private const val COLUMN_STEPS = "steps"
        private const val COLUMN_CALORIES = "calories"
        private const val COLUMN_DISTANCE = "distance"
        private const val COLUMN_LAST_SENSOR_VALUE = "last_sensor_value"
        private const val COLUMN_CREATED_AT = "created_at"
        private const val COLUMN_UPDATED_AT = "updated_at"
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createTableQuery = """
            CREATE TABLE $TABLE_DAILY_STEPS (
                $COLUMN_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COLUMN_DATE TEXT NOT NULL UNIQUE,
                $COLUMN_STEPS INTEGER NOT NULL DEFAULT 0,
                $COLUMN_CALORIES REAL NOT NULL DEFAULT 0.0,
                $COLUMN_DISTANCE REAL NOT NULL DEFAULT 0.0,
                $COLUMN_LAST_SENSOR_VALUE INTEGER NOT NULL DEFAULT 0,
                $COLUMN_CREATED_AT TEXT NOT NULL,
                $COLUMN_UPDATED_AT TEXT NOT NULL
            )
        """.trimIndent()
        
        db.execSQL(createTableQuery)
        
        // 날짜 인덱스 생성
        db.execSQL("CREATE INDEX idx_date ON $TABLE_DAILY_STEPS($COLUMN_DATE)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_DAILY_STEPS")
        onCreate(db)
    }

    /**
     * 특정 날짜의 걸음수 데이터 저장/업데이트
     */
    fun saveStepData(date: String, steps: Int, calories: Double, distance: Double, lastSensorValue: Int): Boolean {
        val db = writableDatabase
        return try {
            val currentTime = getCurrentTimestamp()
            val values = ContentValues().apply {
                put(COLUMN_DATE, date)
                put(COLUMN_STEPS, steps)
                put(COLUMN_CALORIES, calories)
                put(COLUMN_DISTANCE, distance)
                put(COLUMN_LAST_SENSOR_VALUE, lastSensorValue)
                put(COLUMN_UPDATED_AT, currentTime)
            }

            // 기존 데이터가 있는지 확인
            val cursor = db.query(
                TABLE_DAILY_STEPS,
                arrayOf(COLUMN_ID),
                "$COLUMN_DATE = ?",
                arrayOf(date),
                null, null, null
            )

            val result = if (cursor.moveToFirst()) {
                // 업데이트
                val rowsAffected = db.update(
                    TABLE_DAILY_STEPS,
                    values,
                    "$COLUMN_DATE = ?",
                    arrayOf(date)
                )
                rowsAffected > 0
            } else {
                // 새로 삽입
                values.put(COLUMN_CREATED_AT, currentTime)
                val rowId = db.insert(TABLE_DAILY_STEPS, null, values)
                rowId != -1L
            }
            
            cursor.close()
            result
        } catch (e: Exception) {
            e.printStackTrace()
            false
        } finally {
            db.close()
        }
    }

    /**
     * 특정 날짜의 걸음수 데이터 조회
     */
    fun getStepData(date: String): StepData? {
        val db = readableDatabase
        return try {
            val cursor = db.query(
                TABLE_DAILY_STEPS,
                arrayOf(COLUMN_STEPS, COLUMN_CALORIES, COLUMN_DISTANCE, COLUMN_LAST_SENSOR_VALUE),
                "$COLUMN_DATE = ?",
                arrayOf(date),
                null, null, null
            )

            if (cursor.moveToFirst()) {
                val stepData = StepData(
                    date = date,
                    steps = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_STEPS)),
                    calories = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_CALORIES)),
                    distance = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_DISTANCE)),
                    lastSensorValue = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_LAST_SENSOR_VALUE))
                )
                cursor.close()
                stepData
            } else {
                cursor.close()
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        } finally {
            db.close()
        }
    }

    /**
     * 날짜 범위의 걸음수 데이터 조회
     */
    fun getStepDataRange(startDate: String, endDate: String): List<StepData> {
        val db = readableDatabase
        val stepDataList = mutableListOf<StepData>()
        
        try {
            val cursor = db.query(
                TABLE_DAILY_STEPS,
                arrayOf(COLUMN_DATE, COLUMN_STEPS, COLUMN_CALORIES, COLUMN_DISTANCE, COLUMN_LAST_SENSOR_VALUE),
                "$COLUMN_DATE BETWEEN ? AND ?",
                arrayOf(startDate, endDate),
                null, null, "$COLUMN_DATE ASC"
            )

            while (cursor.moveToNext()) {
                val stepData = StepData(
                    date = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_DATE)),
                    steps = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_STEPS)),
                    calories = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_CALORIES)),
                    distance = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_DISTANCE)),
                    lastSensorValue = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_LAST_SENSOR_VALUE))
                )
                stepDataList.add(stepData)
            }
            cursor.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }
        
        return stepDataList
    }

    /**
     * 특정 날짜의 데이터 삭제
     */
    fun deleteStepData(date: String): Boolean {
        val db = writableDatabase
        return try {
            val rowsDeleted = db.delete(
                TABLE_DAILY_STEPS,
                "$COLUMN_DATE = ?",
                arrayOf(date)
            )
            rowsDeleted > 0
        } catch (e: Exception) {
            e.printStackTrace()
            false
        } finally {
            db.close()
        }
    }

    /**
     * 모든 데이터 조회 (디버그용)
     */
    fun getAllStepData(): List<StepData> {
        val db = readableDatabase
        val stepDataList = mutableListOf<StepData>()
        
        try {
            val cursor = db.query(
                TABLE_DAILY_STEPS,
                arrayOf(COLUMN_DATE, COLUMN_STEPS, COLUMN_CALORIES, COLUMN_DISTANCE, COLUMN_LAST_SENSOR_VALUE),
                null, null, null, null, "$COLUMN_DATE DESC"
            )

            while (cursor.moveToNext()) {
                val stepData = StepData(
                    date = cursor.getString(cursor.getColumnIndexOrThrow(COLUMN_DATE)),
                    steps = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_STEPS)),
                    calories = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_CALORIES)),
                    distance = cursor.getDouble(cursor.getColumnIndexOrThrow(COLUMN_DISTANCE)),
                    lastSensorValue = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_LAST_SENSOR_VALUE))
                )
                stepDataList.add(stepData)
            }
            cursor.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }
        
        return stepDataList
    }

    /**
     * 걸음수 데이터 삽입 또는 업데이트 (백그라운드 서비스용)
     */
    fun insertOrUpdateStepData(date: String, steps: Int, calories: Double, distance: Double, lastSensorValue: Int) {
        val db = writableDatabase
        val timestamp = getCurrentTimestamp()
        
        try {
            // 기존 데이터가 있는지 확인
            val cursor = db.query(
                TABLE_DAILY_STEPS,
                arrayOf(COLUMN_ID, COLUMN_STEPS),
                "$COLUMN_DATE = ?",
                arrayOf(date),
                null, null, null
            )
            
            val values = ContentValues().apply {
                put(COLUMN_DATE, date)
                put(COLUMN_STEPS, steps)
                put(COLUMN_CALORIES, calories)
                put(COLUMN_DISTANCE, distance)
                put(COLUMN_LAST_SENSOR_VALUE, lastSensorValue)
                put(COLUMN_UPDATED_AT, timestamp)
            }
            
            if (cursor.moveToFirst()) {
                // 기존 데이터 업데이트
                val existingSteps = cursor.getInt(cursor.getColumnIndexOrThrow(COLUMN_STEPS))
                if (steps > existingSteps) {
                    // 더 큰 값으로만 업데이트
                    db.update(
                        TABLE_DAILY_STEPS,
                        values,
                        "$COLUMN_DATE = ?",
                        arrayOf(date)
                    )
                }
            } else {
                // 새로운 데이터 삽입
                values.put(COLUMN_CREATED_AT, timestamp)
                db.insert(TABLE_DAILY_STEPS, null, values)
            }
            
            cursor.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }
    }

    private fun getCurrentTimestamp(): String {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        return dateFormat.format(Date())
    }

    /**
     * 걸음수 데이터 클래스
     */
    data class StepData(
        val date: String,
        val steps: Int,
        val calories: Double,
        val distance: Double,
        val lastSensorValue: Int
    )
}
