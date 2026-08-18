import Foundation
import Firebase
import FirebaseMessaging
import React

@objc(FirebaseMessagingModule)
class FirebaseMessagingModule: RCTEventEmitter {
  
  override init() {
    super.init()
    setupFirebaseMessaging()
  }
  
  override func supportedEvents() -> [String]! {
    return ["onForegroundMessage", "onBackgroundMessage", "onTokenRefresh"]
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  private func setupFirebaseMessaging() {
    // Firebase 초기화 (AppDelegate에서 이미 했다면 생략 가능)
    if FirebaseApp.app() == nil {
      FirebaseApp.configure()
    }
    
    // FCM delegate 설정
    Messaging.messaging().delegate = self
    
    // 토큰 새로고침 알림 등록
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(tokenRefreshNotification),
      name: .MessagingRegistrationTokenRefreshed,
      object: nil
    )
  }
  
  @objc private func tokenRefreshNotification(_ notification: Notification) {
    getFCMToken { [weak self] token in
      if let token = token {
        self?.sendEvent(withName: "onTokenRefresh", body: ["token": token])
      }
    }
  }
  
  @objc
  func getFCMToken(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    getFCMToken { token in
      if let token = token {
        resolve(token)
      } else {
        reject("FCM_TOKEN_ERROR", "Failed to get FCM token", nil)
      }
    }
  }
  
  private func getFCMToken(completion: @escaping (String?) -> Void) {
    Messaging.messaging().token { token, error in
      if let error = error {
        print("Error fetching FCM registration token: \(error)")
        completion(nil)
      } else if let token = token {
        print("FCM registration token: \(token)")
        completion(token)
      } else {
        completion(nil)
      }
    }
  }
  
  @objc
  func requestPermission(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
      if let error = error {
        reject("PERMISSION_ERROR", error.localizedDescription, error)
      } else {
        resolve(granted)
      }
    }
  }
  
  @objc
  func subscribeToTopic(_ topic: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Messaging.messaging().subscribe(toTopic: topic) { error in
      if let error = error {
        reject("SUBSCRIBE_ERROR", error.localizedDescription, error)
      } else {
        resolve("Successfully subscribed to topic: \(topic)")
      }
    }
  }
  
  @objc
  func unsubscribeFromTopic(_ topic: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    Messaging.messaging().unsubscribe(fromTopic: topic) { error in
      if let error = error {
        reject("UNSUBSCRIBE_ERROR", error.localizedDescription, error)
      } else {
        resolve("Successfully unsubscribed from topic: \(topic)")
      }
    }
  }
  
  @objc
  func getInitialMessage(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // iOS에서는 initial message가 다르게 처리됨
    resolve(nil)
  }
}

// MARK: - MessagingDelegate
extension FirebaseMessagingModule: MessagingDelegate {
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    print("Firebase registration token: \(String(describing: fcmToken))")
    
    if let token = fcmToken {
      sendEvent(withName: "onTokenRefresh", body: ["token": token])
    }
  }
}
