import Foundation
import CoreMotion
import HealthKit
import React

@objc(StepTrackerModule)
class StepTrackerModule: RCTEventEmitter {
  
  private let pedometer = CMPedometer()
  private let healthStore = HKHealthStore()
  private var isTracking = false
  private var stepDatabase: StepDatabase!
  
  override init() {
    super.init()
    stepDatabase = StepDatabase()
    stepDatabase.clearInvalidData() // 잘못된 데이터 정리
    setupHealthKit()
  }
  
  // MARK: - RCTEventEmitter
  
  override func supportedEvents() -> [String]! {
    return ["stepDataUpdated"]
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // MARK: - HealthKit Setup
  
  private func setupHealthKit() {
    guard HKHealthStore.isHealthDataAvailable() else {
      print("HealthKit is not available on this device")
      return
    }
    
    let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    let distanceType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!
    let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
    
    let readTypes: Set<HKObjectType> = [stepType, distanceType, energyType]
    
    healthStore.requestAuthorization(toShare: nil, read: readTypes) { [weak self] success, error in
      if success {
        print("HealthKit authorization granted")
        self?.startHealthKitObserver()
      } else {
        print("HealthKit authorization failed: \(error?.localizedDescription ?? "Unknown error")")
      }
    }
  }
  
  private func startHealthKitObserver() {
    let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    
    let query = HKObserverQuery(sampleType: stepType, predicate: nil) { [weak self] _, _, error in
      if error == nil {
        DispatchQueue.main.async {
          self?.updateTodayStepData()
        }
      }
    }
    
    healthStore.execute(query)
    healthStore.enableBackgroundDelivery(for: stepType, frequency: .immediate) { _, _ in }
  }
  
  // MARK: - React Native Methods
  
  @objc
  func initializeTracker(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let hasStepCounter = CMPedometer.isStepCountingAvailable()
    let hasAccelerometer = CMMotionManager().isAccelerometerAvailable
    let hasHealthKit = HKHealthStore.isHealthDataAvailable()
    
    let result: [String: Any] = [
      "success": true,
      "message": "iOS StepTracker initialized successfully",
      "hasStepCounter": hasStepCounter,
      "hasAccelerometer": hasAccelerometer,
      "hasHealthKit": hasHealthKit,
      "totalSensors": (hasStepCounter ? 1 : 0) + (hasAccelerometer ? 1 : 0),
      "stepCounterSensors": hasStepCounter ? 1 : 0,
      "accelerometerSensors": hasAccelerometer ? 1 : 0,
      "stepCounterName": "iOS CoreMotion Pedometer",
      "stepCounterVendor": "Apple"
    ]
    
    resolve(result)
  }
  
  @objc
  func startTracking(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard CMPedometer.isStepCountingAvailable() else {
      reject("STEP_COUNTING_UNAVAILABLE", "Step counting is not available on this device", nil)
      return
    }
    
    let startDate = Calendar.current.startOfDay(for: Date())
    
    pedometer.startUpdates(from: startDate) { [weak self] data, error in
      if let error = error {
        reject("PEDOMETER_ERROR", error.localizedDescription, error)
        return
      }
      
      if let data = data {
        DispatchQueue.main.async {
          self?.processPedometerData(data)
        }
      }
    }
    
    isTracking = true
    resolve("Step tracking started successfully")
  }
  
  @objc
  func stopTracking(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    pedometer.stopUpdates()
    isTracking = false
    resolve("Step tracking stopped successfully")
  }
  
  @objc
  func getTodayData(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let today = getCurrentDateString()
    
    // 항상 HealthKit에서 최신 오늘 데이터를 가져와서 DB 업데이트
    print("🍎 Fetching latest today data from HealthKit")
    fetchHealthKitData(for: Date()) { [weak self] stepData in
      if let stepData = stepData, stepData.steps > 0 {
        print("🍎 Today HealthKit data: steps=\(stepData.steps), calories=\(stepData.calories)")
        // 데이터베이스에 최신 데이터 저장/업데이트
        self?.stepDatabase.insertOrUpdateStepData(stepData)
        resolve(stepData.toDictionary())
      } else {
        print("🍎 No HealthKit data for today")
        // HealthKit에 데이터가 없으면 DB에서 기존 데이터 확인
        if let existingData = self?.stepDatabase.getStepData(for: today), existingData.steps > 0 {
          print("🍎 Using existing DB data for today: steps=\(existingData.steps)")
          resolve(existingData.toDictionary())
        } else {
          // 둘 다 없으면 빈 기본값 반환
          let defaultData = StepData(
            date: today,
            steps: 0,
            calories: 0.0,
            distance: 0.0,
            lastSensorValue: 0
          )
          resolve(defaultData.toDictionary())
        }
      }
    }
  }
  
  @objc
  func getDataByDate(_ dateString: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // 날짜 파싱
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    
    guard let date = dateFormatter.date(from: dateString) else {
      reject("INVALID_DATE", "Invalid date format. Use yyyy-MM-dd", nil)
      return
    }
    
    // 항상 HealthKit에서 최신 데이터를 가져와서 DB 업데이트
    print("🍎 Fetching latest data from HealthKit for \(dateString)")
    fetchHealthKitData(for: date) { [weak self] stepData in
      if let stepData = stepData, stepData.steps > 0 {
        print("🍎 HealthKit data for \(dateString): steps=\(stepData.steps), calories=\(stepData.calories)")
        // DB에 최신 데이터 저장/업데이트
        self?.stepDatabase.insertOrUpdateStepData(stepData)
        resolve(stepData.toDictionary())
      } else {
        print("🍎 No HealthKit data for \(dateString)")
        // HealthKit에 데이터가 없으면 DB에서 기존 데이터 확인
        if let existingData = self?.stepDatabase.getStepData(for: dateString), existingData.steps > 0 {
          print("🍎 Using existing DB data for \(dateString): steps=\(existingData.steps)")
          resolve(existingData.toDictionary())
        } else {
          // 둘 다 없으면 빈 기본값 반환
          let defaultData = StepData(
            date: dateString,
            steps: 0,
            calories: 0.0,
            distance: 0.0,
            lastSensorValue: 0
          )
          resolve(defaultData.toDictionary())
        }
      }
    }
  }
  
  @objc
  func getDataByDateRange(_ startDateString: String, endDateString: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "yyyy-MM-dd"
    
    guard let startDate = dateFormatter.date(from: startDateString),
          let endDate = dateFormatter.date(from: endDateString) else {
      reject("INVALID_DATE", "Invalid date format. Use yyyy-MM-dd", nil)
      return
    }
    
    print("🍎 iOS getDataByDateRange called: \(startDateString) to \(endDateString)")
    
    var results: [[String: Any]] = []
    let calendar = Calendar.current
    var currentDate = startDate
    
    let group = DispatchGroup()
    
    while currentDate <= endDate {
      let dateString = dateFormatter.string(from: currentDate)
      print("🍎 Processing date: \(dateString)")
      
      group.enter()
      
      // 항상 HealthKit에서 최신 데이터를 가져와서 DB 업데이트
      print("🍎 Fetching latest data from HealthKit for \(dateString)")
      fetchHealthKitData(for: currentDate) { [weak self] stepData in
        if let stepData = stepData, stepData.steps > 0 {
          print("🍎 HealthKit data found for \(dateString): steps=\(stepData.steps), calories=\(stepData.calories)")
          // DB에 최신 데이터 저장/업데이트
          self?.stepDatabase.insertOrUpdateStepData(stepData)
          results.append(stepData.toDictionary())
        } else {
          print("🍎 No HealthKit data for \(dateString)")
          // 데이터가 없어도 DB에서 기존 데이터가 있는지 확인
          if let existingData = self?.stepDatabase.getStepData(for: dateString), existingData.steps > 0 {
            print("🍎 Using existing DB data for \(dateString): steps=\(existingData.steps)")
            results.append(existingData.toDictionary())
          }
          // 둘 다 없으면 아무것도 추가하지 않음
        }
        group.leave()
      }
      
      currentDate = calendar.date(byAdding: .day, value: 1, to: currentDate)!
    }
    
    group.notify(queue: .main) {
      // 날짜순으로 정렬
      let sortedResults = results.sorted { dict1, dict2 in
        let date1 = dict1["date"] as? String ?? ""
        let date2 = dict2["date"] as? String ?? ""
        return date1 < date2
      }
      resolve(sortedResults)
    }
  }
  
  @objc
  func resetTodayData(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let today = getCurrentDateString()
    stepDatabase.resetStepData(for: today)
    resolve("Today's data has been reset")
  }
  
  @objc
  func getSensorStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let status: [String: Any] = [
      "isStepCountingAvailable": CMPedometer.isStepCountingAvailable(),
      "isDistanceAvailable": CMPedometer.isDistanceAvailable(),
      "isFloorCountingAvailable": CMPedometer.isFloorCountingAvailable(),
      "isPaceAvailable": CMPedometer.isPaceAvailable(),
      "isCadenceAvailable": CMPedometer.isCadenceAvailable(),
      "isHealthKitAvailable": HKHealthStore.isHealthDataAvailable(),
      "isTracking": isTracking
    ]
    resolve(status)
  }
  
  @objc
  func getAllDatabaseData(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    stepDatabase.clearInvalidData() // 호출할 때마다 잘못된 데이터 정리
    let allData = stepDatabase.getAllStepData()
    let dictArray = allData.map { $0.toDictionary() }
    resolve(dictArray)
  }
  
  @objc
  func clearAllDatabaseData(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    stepDatabase.clearAllData()
    resolve("All database data cleared successfully")
  }
  
  // MARK: - Private Methods
  
  private func processPedometerData(_ data: CMPedometerData) {
    let today = getCurrentDateString()
    let steps = data.numberOfSteps.intValue
    let distance = data.distance?.doubleValue ?? 0.0
    
    // 칼로리 계산 (대략적인 계산: 걸음수 * 0.04)
    let calories = Double(steps) * 0.04
    
    let stepData = StepData(
      date: today,
      steps: steps,
      calories: calories,
      distance: distance,
      lastSensorValue: steps
    )
    
    stepDatabase.insertOrUpdateStepData(stepData)
    
    // React Native에 이벤트 전송
    sendEvent(withName: "stepDataUpdated", body: [
      "steps": steps,
      "calories": calories,
      "distance": distance
    ])
  }
  
  private func updateTodayStepData() {
    fetchHealthKitData(for: Date()) { [weak self] stepData in
      if let stepData = stepData {
        self?.stepDatabase.insertOrUpdateStepData(stepData)
        
        // React Native에 이벤트 전송
        self?.sendEvent(withName: "stepDataUpdated", body: [
          "steps": stepData.steps,
          "calories": stepData.calories,
          "distance": stepData.distance
        ])
      }
    }
  }
  
  private func fetchHealthKitData(for date: Date, completion: @escaping (StepData?) -> Void) {
    let calendar = Calendar.current
    let startOfDay = calendar.startOfDay(for: date)
    let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
    
    let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)
    
    let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
    let distanceType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!
    let energyType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
    
    var steps = 0
    var distance = 0.0
    var calories = 0.0
    
    let group = DispatchGroup()
    
    // 걸음수 가져오기
    group.enter()
    let stepQuery = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
      if let result = result, let sum = result.sumQuantity() {
        steps = Int(sum.doubleValue(for: HKUnit.count()))
      }
      group.leave()
    }
    healthStore.execute(stepQuery)
    
    // 거리 가져오기
    group.enter()
    let distanceQuery = HKStatisticsQuery(quantityType: distanceType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
      if let result = result, let sum = result.sumQuantity() {
        distance = sum.doubleValue(for: HKUnit.meter())
      }
      group.leave()
    }
    healthStore.execute(distanceQuery)
    
    // 칼로리 가져오기
    group.enter()
    let energyQuery = HKStatisticsQuery(quantityType: energyType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, _ in
      if let result = result, let sum = result.sumQuantity() {
        calories = sum.doubleValue(for: HKUnit.kilocalorie())
      }
      group.leave()
    }
    healthStore.execute(energyQuery)
    
    group.notify(queue: .main) {
      let dateFormatter = DateFormatter()
      dateFormatter.dateFormat = "yyyy-MM-dd"
      let dateString = dateFormatter.string(from: date)
      
      // 칼로리가 0이거나 없는 경우 걸음수를 기반으로 계산
      let calculatedCalories = calories > 0 ? calories : Double(steps) * 0.04
      
      print("📊 HealthKit data for \(dateString): steps=\(steps), distance=\(distance)m, calories=\(calculatedCalories)")
      
      let stepData = StepData(
        date: dateString,
        steps: steps,
        calories: calculatedCalories,
        distance: distance,
        lastSensorValue: steps
      )
      
      completion(stepData)
    }
  }
  
  private func getCurrentDateString() -> String {
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: Date())
  }
}

// MARK: - StepData Model

struct StepData {
  let date: String
  let steps: Int
  let calories: Double
  let distance: Double
  let lastSensorValue: Int
  
  func toDictionary() -> [String: Any] {
    return [
      "date": date,
      "steps": steps,
      "calories": calories,
      "distance": distance,
      "lastSensorValue": lastSensorValue
    ]
  }
}
