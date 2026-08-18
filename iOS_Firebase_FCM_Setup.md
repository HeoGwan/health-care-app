# iOS Firebase 및 FCM 설정 가이드

## 개요

iOS에서 Firebase Cloud Messaging (FCM)과 JWT 토큰이 제대로 작동하도록 하는 설정 가이드입니다.

## 구현된 파일들

### 1. Firebase 모듈 파일들

- `ios/ReactNativeWebView/FirebaseMessagingModule.swift`: iOS FCM 네이티브 모듈
- `ios/ReactNativeWebView/FirebaseMessagingModule.m`: Objective-C 브리지
- `ios/ReactNativeWebView/AppDelegate.swift`: Firebase 초기화 및 푸시 알림 설정

### 2. 업데이트된 서비스 파일들

- `src/services/fcmService.ts`: iOS 네이티브 모듈 지원 추가

## 필수 설정 사항

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. iOS 앱 추가
3. Bundle ID 설정: `com.insystem.routinecare`
4. App nickname: `Routine Care`
5. `GoogleService-Info.plist` 다운로드

### 2. GoogleService-Info.plist 추가

1. Firebase Console에서 다운로드한 `GoogleService-Info.plist` 파일
2. Xcode에서 `ios/ReactNativeWebView/` 폴더에 추가
3. Target에 추가되었는지 확인

### 3. Xcode에서 파일 추가

다음 파일들을 Xcode 프로젝트에 추가:

```
FirebaseMessagingModule.swift
FirebaseMessagingModule.m
AppDelegate.swift (이미 있으면 내용 업데이트)
GoogleService-Info.plist
```

### 4. Podfile 업데이트

```ruby
target 'ReactNativeWebView' do
  # Firebase dependencies
  pod 'Firebase/Core'
  pod 'Firebase/Messaging'

  # 기존 설정들...
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )
end
```

### 5. Push Notification Capability 추가

1. Xcode → Project Navigator → ReactNativeWebView
2. Signing & Capabilities 탭
3. - Capability 클릭
4. "Push Notifications" 추가

### 6. Background Modes 추가

1. Signing & Capabilities 탭
2. - Capability 클릭
3. "Background Modes" 추가
4. "Background processing" 체크
5. "Remote notifications" 체크

## APNs 인증서 설정

### 1. Apple Developer Console에서:

1. Certificates, Identifiers & Profiles 이동
2. Keys 섹션에서 새 키 생성
3. Apple Push Notifications service (APNs) 체크
4. .p8 키 파일 다운로드

### 2. Firebase Console에서:

1. Project Settings → Cloud Messaging 탭
2. iOS 앱 구성 섹션
3. APNs 인증 키 업로드
4. Key ID, Team ID 입력

## 테스트 방법

### 1. FCM 토큰 확인

```typescript
import fcmService from '../services/fcmService';

const testFCM = async () => {
  const token = await fcmService.getFcmToken();
  console.log('FCM Token:', token);
};
```

### 2. 푸시 알림 권한 확인

```typescript
const testPermission = async () => {
  const permission = await fcmService.requestPermission();
  console.log('Push Permission:', permission);
};
```

### 3. 메시지 수신 테스트

Firebase Console → Cloud Messaging에서 테스트 메시지 전송

## 현재 WebViewScreen.tsx에서 작동하는 기능들

### ✅ **iOS에서 정상 작동:**

1. **JWT 토큰 처리**

   - WebView localStorage에서 토큰 추출
   - AsyncStorage 저장/조회
   - API 호출 시 Bearer 토큰 사용

2. **HTTP API 호출**
   - fetch API는 플랫폼 독립적
   - FCM 토큰 API 전송
   - 센서 데이터 API 전송

### ✅ **새로 구현된 iOS 기능:**

1. **FCM 토큰 생성**

   - iOS 네이티브 모듈로 FCM 토큰 획득
   - 자동 토큰 새로고침
   - 권한 요청 처리

2. **푸시 알림 수신**
   - 포그라운드/백그라운드 메시지 처리
   - React Native 이벤트 브리지
   - WebView와 연동

## 주의사항

### 1. 실제 기기에서만 테스트

- iOS 시뮬레이터는 푸시 알림 미지원
- FCM 토큰은 실제 기기에서만 생성

### 2. 개발/프로덕션 환경 구분

- Debug/Release 빌드에 따라 다른 APNs 환경 사용
- Firebase Console에서 각각 설정 필요

### 3. 권한 요청 타이밍

- 앱 첫 실행 시 권한 요청
- 사용자가 거부하면 설정 앱에서 직접 변경 필요

## 트러블슈팅

### 1. FCM 토큰이 null인 경우

- GoogleService-Info.plist 파일 확인
- Bundle ID 일치 여부 확인
- APNs 인증서 설정 확인

### 2. 푸시 알림을 받지 못하는 경우

- 권한 허용 상태 확인
- Background App Refresh 설정 확인
- Firebase Console에서 메시지 전송 로그 확인

### 3. 빌드 오류가 발생하는 경우

- pod install 실행
- Clean Build Folder (Cmd+Shift+K)
- Derived Data 삭제

## 완료 후 확인사항

iOS 설정이 완료되면 다음 기능들이 모두 작동해야 합니다:

1. ✅ JWT 토큰 추출 및 API 호출
2. ✅ FCM 토큰 생성 및 서버 전송
3. ✅ 푸시 알림 수신
4. ✅ 센서 기반 걸음수 데이터 전송
5. ✅ WebView와 네이티브 간 메시지 통신

모든 설정이 완료되면 Android와 동일한 수준의 기능을 iOS에서도 사용할 수 있습니다.
