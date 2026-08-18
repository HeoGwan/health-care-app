# Step Tracker Native Module

센서 기반 걸음수 추적과 SQLite 데이터베이스 저장을 제공하는 React Native 네이티브 모듈입니다.

## 기능

- ✅ **센서 기반 걸음수 추적**: TYPE_STEP_COUNTER 센서 또는 가속도계 사용
- ✅ **SQLite 데이터베이스**: 날짜별 걸음수, 칼로리, 거리 데이터 로컬 저장
- ✅ **실시간 업데이트**: 걸음수 변화 실시간 감지 및 UI 업데이트
- ✅ **자동 복구**: 앱 종료 후 재시작 시 데이터 자동 복원
- ✅ **배경 추적**: 앱이 백그라운드에 있을 때도 걸음수 추적
- ✅ **목표 설정**: 일일 걸음수 목표 및 진행률 표시
- ✅ **주간/월간 통계**: 기간별 데이터 조회 및 분석

## 설치된 파일들

### Android 네이티브 모듈

- `StepTrackerModule.kt` - 메인 네이티브 모듈
- `StepTrackerDatabase.kt` - SQLite 데이터베이스 헬퍼
- `StepTrackerPackage.kt` - React Native 패키지 등록

### React Native 인터페이스

- `stepTrackerService.ts` - 네이티브 모듈 래퍼 서비스
- `useStepTracker.ts` - React Hook
- `StepTrackerComponent.tsx` - 사용 예시 컴포넌트
- `stepTracker.ts` - TypeScript 타입 정의

## 사용 방법

### 1. 기본 사용법 (Hook 사용)

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import { useStepTracker } from '../hooks/useStepTracker';

const MyComponent = () => {
  const { todayData, isTracking, goalAchieved, startTracking, stopTracking } =
    useStepTracker({
      autoStart: true,
      dailyGoal: 10000,
    });

  return (
    <View>
      <Text>오늘 걸음수: {todayData?.steps || 0}</Text>
      <Text>칼로리: {todayData?.calories.toFixed(0)} kcal</Text>
      <Text>거리: {todayData?.distance.toFixed(2)} km</Text>
      <Text>목표 달성: {goalAchieved ? '✅' : '❌'}</Text>
    </View>
  );
};
```

### 2. 서비스 직접 사용

```typescript
import stepTrackerService from '../services/stepTrackerService';

// 초기화
await stepTrackerService.initialize();

// 추적 시작
await stepTrackerService.startTracking();

// 오늘 데이터 조회
const todayData = await stepTrackerService.getTodayData();

// 주간 데이터 조회
const weeklyData = await stepTrackerService.getWeeklyData();

// 실시간 업데이트 리스너
const removeListener = stepTrackerService.addStepDataListener(data => {
  console.log('새로운 걸음수:', data.steps);
});
```

### 3. 컴포넌트 사용

```typescript
import React from 'react';
import { StepTrackerComponent } from '../components';

const App = () => {
  return <StepTrackerComponent />;
};
```

## 데이터 구조

### DailyStepData

```typescript
interface DailyStepData {
  date: string; // YYYY-MM-DD 형식
  steps: number; // 걸음수
  calories: number; // 칼로리 (kcal)
  distance: number; // 거리 (km)
  lastSensorValue: number; // 마지막 센서 값
}
```

## 주요 메서드

### StepTrackerService

- `initialize()` - 모듈 초기화
- `startTracking()` - 걸음수 추적 시작
- `stopTracking()` - 걸음수 추적 중지
- `getTodayData()` - 오늘 데이터 조회
- `getDataByDate(date)` - 특정 날짜 데이터 조회
- `getWeeklyData()` - 주간 데이터 조회 (7일)
- `getMonthlyData()` - 월간 데이터 조회 (30일)
- `resetTodayData()` - 오늘 데이터 리셋

### useStepTracker Hook

- 자동 초기화 및 추적 시작
- 실시간 데이터 업데이트
- 목표 달성률 계산
- 앱 상태 변화 대응

## 권한 설정

AndroidManifest.xml에 다음 권한이 자동으로 추가됩니다:

```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-feature android:name="android.hardware.sensor.stepcounter" android:required="false" />
<uses-feature android:name="android.hardware.sensor.accelerometer" android:required="false" />
```

## 센서 지원

1. **TYPE_STEP_COUNTER** (우선순위 1): 하드웨어 걸음수 센서

   - 정확도 높음
   - 배터리 효율적
   - Android 4.4+ 지원

2. **TYPE_ACCELEROMETER** (우선순위 2): 가속도계 기반
   - 걸음수 센서가 없는 기기에서 사용
   - 알고리즘 기반 걸음수 감지
   - 배터리 사용량 높음

## 데이터 저장

- **로컬 SQLite 데이터베이스** 사용
- 날짜별로 데이터 저장
- 앱 제거 시까지 데이터 유지
- 자동 백업 및 복원

## 계산 공식

- **칼로리**: 걸음수 × 0.04 kcal
- **거리**: 걸음수 × 0.762m (평균 보폭)

## 주의사항

1. **권한 요청**: Android 10+ 에서는 ACTIVITY_RECOGNITION 권한 런타임 요청 필요
2. **센서 가용성**: 모든 기기에서 걸음수 센서가 지원되지 않을 수 있음
3. **백그라운드 추적**: 일부 기기에서 배터리 최적화로 인해 제한될 수 있음
4. **정확도**: 센서 품질과 기기 특성에 따라 정확도 차이 있음

## 확장 가능성

이 모듈은 다음과 같이 확장할 수 있습니다:

1. **다른 건강 데이터**: 심박수, 수면 패턴 등
2. **클라우드 동기화**: Firebase, AWS 등과 연동
3. **알림 기능**: 목표 달성, 리마인더 등
4. **소셜 기능**: 친구와 걸음수 비교
5. **운동 모드**: 러닝, 워킹 등 운동 타입별 추적

## 빌드

```bash
# Android 빌드
cd android
./gradlew assembleDebug

# React Native 실행
npx react-native run-android
```

## 문제 해결

### 센서가 감지되지 않는 경우

1. 기기에서 걸음수 센서 지원 여부 확인
2. 권한 설정 확인
3. 가속도계 fallback 사용

### 데이터가 저장되지 않는 경우

1. 앱 권한 확인
2. 저장소 공간 확인
3. 로그 확인 (`adb logcat`)

### 백그라운드에서 추적이 안 되는 경우

1. 배터리 최적화 설정 확인
2. 자동 시작 관리자 설정 확인
3. 백그라운드 앱 새로 고침 허용

이제 프로젝트에서 StepTrackerComponent를 import해서 사용하거나, useStepTracker Hook을 사용해서 커스텀 UI를 만들 수 있습니다!
