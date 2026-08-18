# iOS StepTracker 모듈 설정 가이드

## 개요

iOS에서 Android와 동일한 StepTracker 기능을 제공하기 위해 HealthKit과 CoreMotion을 사용하는 네이티브 모듈을 구현했습니다.

## 구현된 파일들

### 1. Swift 파일들

- `ios/ReactNativeWebView/StepTrackerModule.swift`: 메인 StepTracker 모듈
- `ios/ReactNativeWebView/StepDatabase.swift`: SQLite 데이터베이스 관리
- `ios/ReactNativeWebView/StepTrackerModule.m`: Objective-C 브리지

### 2. 설정 파일들

- `ios/ReactNativeWebView/Info.plist`: HealthKit 권한 추가
- `ios/Podfile`: 필요한 dependency 추가

## Xcode에서 수동 설정 필요사항

### 1. Swift 파일 추가

Xcode에서 다음 파일들을 프로젝트에 추가:

```
StepTrackerModule.swift
StepDatabase.swift
StepTrackerModule.m
```

### 2. HealthKit 프레임워크 추가

1. 프로젝트 설정 → Target → ReactNativeWebView
2. "Frameworks, Libraries, and Embedded Content" 섹션
3. - 버튼 클릭 → HealthKit.framework 추가
4. CoreMotion.framework 추가

### 3. Capabilities 추가

1. 프로젝트 설정 → Target → ReactNativeWebView
2. "Signing & Capabilities" 탭
3. - Capability 버튼 클릭
4. HealthKit 추가

### 4. Swift Bridging Header 설정

1. Build Settings에서 "Swift Compiler - General" 찾기
2. "Objective-C Bridging Header" 설정
3. 값: `ReactNativeWebView/ReactNativeWebView-Bridging-Header.h`

### 5. Bridging Header 파일 생성

`ios/ReactNativeWebView/ReactNativeWebView-Bridging-Header.h` 파일 생성:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
```

## 기능

### Android와 동일한 기능 제공:

- ✅ 걸음수 추적 시작/중지
- ✅ 오늘 데이터 조회
- ✅ 날짜별 데이터 조회
- ✅ 날짜 범위 데이터 조회
- ✅ SQLite 데이터베이스 저장
- ✅ 실시간 이벤트 전송
- ✅ 센서 상태 확인

### iOS 특화 기능:

- HealthKit 통합으로 정확한 건강 데이터
- CoreMotion Pedometer 사용
- 백그라운드 데이터 동기화
- 개인정보 보호 강화

## 사용법

JavaScript 코드에서는 Android와 동일하게 사용:

```typescript
import stepTrackerService from '../services/stepTrackerService';

// 초기화
const result = await stepTrackerService.initialize();

// 추적 시작
await stepTrackerService.startTracking();

// 오늘 데이터 가져오기
const todayData = await stepTrackerService.getTodayData();

// 월간 데이터 가져오기
const monthlyData = await stepTrackerService.getMonthlyData();
```

## 권한

iOS에서는 다음 권한이 필요합니다:

- HealthKit 읽기 권한 (걸음수, 거리, 칼로리)
- Motion 사용 권한

Info.plist에 이미 추가되어 있습니다:

- `NSHealthShareUsageDescription`
- `NSHealthUpdateUsageDescription`
- `NSMotionUsageDescription`

## 빌드 및 실행

1. Xcode에서 위의 수동 설정 완료
2. iOS 시뮬레이터 또는 실제 기기에서 테스트
3. 권한 요청 팝업에서 허용 선택

## 주의사항

- iOS 시뮬레이터에서는 실제 걸음수 데이터가 없으므로 테스트 데이터 사용
- 실제 기기에서만 정확한 HealthKit 데이터 확인 가능
- 첫 실행 시 HealthKit 권한 요청 팝업 표시

## 오류 처리

네이티브 모듈이 없거나 오류가 발생해도 앱이 크래시되지 않도록 안전장치 구현:

- 모듈이 없으면 빈 데이터 반환
- 에러 발생 시 기본값 반환
- 로그로 상태 확인 가능
