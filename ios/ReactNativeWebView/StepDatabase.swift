import Foundation
import SQLite3

class StepDatabase {
  private var db: OpaquePointer?
  private let dbPath: String
  
  init() {
    let fileURL = try! FileManager.default
      .url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: false)
      .appendingPathComponent("StepTracker.db")
    
    dbPath = fileURL.path
    
    if sqlite3_open(dbPath, &db) != SQLITE_OK {
      print("Unable to open database")
    } else {
      createTable()
    }
  }
  
  deinit {
    sqlite3_close(db)
  }
  
  private func createTable() {
    let createTableSQL = """
      CREATE TABLE IF NOT EXISTS step_data(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        steps INTEGER NOT NULL,
        calories REAL NOT NULL,
        distance REAL NOT NULL,
        lastSensorValue INTEGER NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    """
    
    if sqlite3_exec(db, createTableSQL, nil, nil, nil) != SQLITE_OK {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("Error creating table: \(errmsg)")
    }
  }
  
  func insertOrUpdateStepData(_ stepData: StepData) {
    // 날짜가 비어있는 경우 에러 로그
    if stepData.date.isEmpty {
      print("❌ insertOrUpdateStepData: 빈 날짜로 데이터 삽입 시도 - steps: \(stepData.steps)")
      return
    }
    
    let insertSQL = """
      INSERT OR REPLACE INTO step_data 
      (date, steps, calories, distance, lastSensorValue, timestamp) 
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    """
    
    var statement: OpaquePointer?
    
    if sqlite3_prepare_v2(db, insertSQL, -1, &statement, nil) == SQLITE_OK {
      sqlite3_bind_text(statement, 1, stepData.date, -1, nil)
      sqlite3_bind_int(statement, 2, Int32(stepData.steps))
      sqlite3_bind_double(statement, 3, stepData.calories)
      sqlite3_bind_double(statement, 4, stepData.distance)
      sqlite3_bind_int(statement, 5, Int32(stepData.lastSensorValue))
      
      if sqlite3_step(statement) == SQLITE_DONE {
        print("✅ Successfully inserted/updated step data for \(stepData.date) - steps: \(stepData.steps)")
      } else {
        let errmsg = String(cString: sqlite3_errmsg(db)!)
        print("❌ Could not insert/update step data: \(errmsg)")
      }
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("❌ INSERT statement could not be prepared: \(errmsg)")
    }
    
    sqlite3_finalize(statement)
  }
  
  func getStepData(for requestedDate: String) -> StepData? {
    let querySQL = "SELECT date, steps, calories, distance, lastSensorValue FROM step_data WHERE date = ?"
    var statement: OpaquePointer?
    var stepData: StepData?
    
    if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK {
      sqlite3_bind_text(statement, 1, requestedDate, -1, nil)
      
      if sqlite3_step(statement) == SQLITE_ROW {
        let datePointer = sqlite3_column_text(statement, 0)
        let date = datePointer != nil ? String(cString: datePointer!) : ""
        let steps = sqlite3_column_int(statement, 1)
        let calories = sqlite3_column_double(statement, 2)
        let distance = sqlite3_column_double(statement, 3)
        let lastSensorValue = sqlite3_column_int(statement, 4)
        
        // 날짜가 빈 문자열인 경우 디버깅 로그
        if date.isEmpty {
          print("⚠️ 데이터베이스에서 빈 날짜 발견, 요청된 날짜로 대체: \(requestedDate)")
        }
        
        stepData = StepData(
          date: date.isEmpty ? requestedDate : date, // 빈 문자열인 경우 요청된 날짜 사용
          steps: Int(steps),
          calories: calories,
          distance: distance,
          lastSensorValue: Int(lastSensorValue)
        )
      }
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("SELECT statement could not be prepared: \(errmsg)")
    }
    
    sqlite3_finalize(statement)
    return stepData
  }
  
  func getAllStepData() -> [StepData] {
    let querySQL = "SELECT date, steps, calories, distance, lastSensorValue FROM step_data ORDER BY date DESC"
    var statement: OpaquePointer?
    var stepDataArray: [StepData] = []
    
    if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK {
      while sqlite3_step(statement) == SQLITE_ROW {
        let datePointer = sqlite3_column_text(statement, 0)
        let date = datePointer != nil ? String(cString: datePointer!) : ""
        let steps = sqlite3_column_int(statement, 1)
        let calories = sqlite3_column_double(statement, 2)
        let distance = sqlite3_column_double(statement, 3)
        let lastSensorValue = sqlite3_column_int(statement, 4)
        
        // 날짜가 빈 문자열인 경우 스킵
        if date.isEmpty {
          print("⚠️ getAllStepData: 빈 날짜 데이터 스킵")
          continue
        }
        
        let stepData = StepData(
          date: date,
          steps: Int(steps),
          calories: calories,
          distance: distance,
          lastSensorValue: Int(lastSensorValue)
        )
        
        stepDataArray.append(stepData)
      }
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("SELECT statement could not be prepared: \(errmsg)")
    }
    
    sqlite3_finalize(statement)
    return stepDataArray
  }
  
  func resetStepData(for date: String) {
    let updateSQL = "UPDATE step_data SET steps = 0, calories = 0, distance = 0, lastSensorValue = 0 WHERE date = ?"
    var statement: OpaquePointer?
    
    if sqlite3_prepare_v2(db, updateSQL, -1, &statement, nil) == SQLITE_OK {
      sqlite3_bind_text(statement, 1, date, -1, nil)
      
      if sqlite3_step(statement) == SQLITE_DONE {
        print("Successfully reset step data for \(date)")
      } else {
        let errmsg = String(cString: sqlite3_errmsg(db)!)
        print("Could not reset step data: \(errmsg)")
      }
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("UPDATE statement could not be prepared: \(errmsg)")
    }
    
    sqlite3_finalize(statement)
  }
  
  func getStepDataByDateRange(startDate: String, endDate: String) -> [StepData] {
    let querySQL = "SELECT date, steps, calories, distance, lastSensorValue FROM step_data WHERE date BETWEEN ? AND ? ORDER BY date"
    var statement: OpaquePointer?
    var stepDataArray: [StepData] = []
    
    if sqlite3_prepare_v2(db, querySQL, -1, &statement, nil) == SQLITE_OK {
      sqlite3_bind_text(statement, 1, startDate, -1, nil)
      sqlite3_bind_text(statement, 2, endDate, -1, nil)
      
      while sqlite3_step(statement) == SQLITE_ROW {
        let date = String(cString: sqlite3_column_text(statement, 0))
        let steps = sqlite3_column_int(statement, 1)
        let calories = sqlite3_column_double(statement, 2)
        let distance = sqlite3_column_double(statement, 3)
        let lastSensorValue = sqlite3_column_int(statement, 4)
        
        let stepData = StepData(
          date: date,
          steps: Int(steps),
          calories: calories,
          distance: distance,
          lastSensorValue: Int(lastSensorValue)
        )
        
        stepDataArray.append(stepData)
      }
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("SELECT statement could not be prepared: \(errmsg)")
    }
    
    sqlite3_finalize(statement)
    return stepDataArray
  }
  
  func clearInvalidData() {
    let deleteSQL = "DELETE FROM step_data WHERE date = '' OR date IS NULL"
    var statement: OpaquePointer?
    
    if sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK {
      if sqlite3_step(statement) == SQLITE_DONE {
        let changes = sqlite3_changes(db)
        print("✅ Cleared \(changes) invalid data entries with empty dates")
      } else {
        let errmsg = String(cString: sqlite3_errmsg(db)!)
        print("❌ Could not clear invalid data: \(errmsg)")
      }
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("❌ DELETE statement could not be prepared: \(errmsg)")
    }
    
    sqlite3_finalize(statement)
  }
  
  func clearAllData() {
    let deleteSQL = "DELETE FROM step_data"
    var statement: OpaquePointer?
    
    if sqlite3_prepare_v2(db, deleteSQL, -1, &statement, nil) == SQLITE_OK {
      if sqlite3_step(statement) == SQLITE_DONE {
        let changes = sqlite3_changes(db)
        print("✅ Cleared all \(changes) data entries from database")
      } else {
        let errmsg = String(cString: sqlite3_errmsg(db)!)
        print("❌ Could not clear all data: \(errmsg)")
      }
    } else {
      let errmsg = String(cString: sqlite3_errmsg(db)!)
      print("❌ DELETE statement could not be prepared: \(errmsg)")
    }
    
    sqlite3_finalize(statement)
  }
}
