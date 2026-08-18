import {
  accelerometer,
  setUpdateIntervalForType,
  SensorTypes,
} from 'react-native-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestHighSamplingRatePermission,
  requestActivityRecognitionPermission,
} from '../utils/permissionUtils';

export interface StepData {
  steps: number;
  calories: number;
  distance: number;
  date: string;
}

class ReactNativeStepTrackerService {
  private isTracking = false;
  private stepCount = 0;
  private lastAcceleration = { x: 0, y: 0, z: 0 };
  private threshold = 1.5; // 걸음 감지 임계값
  private stepLength = 0.762; // 평균 걸음 길이 (미터)
  private caloriesPerStep = 0.04; // 걸음당 칼로리
  private subscription: any = null;

  // 걸음수 추적 시작
  async startTracking(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isTracking) {
        return { success: true, message: 'Already tracking' };
      }

      // 권한 요청
      console.log('권한 요청 시작...');
      const activityPermission = await requestActivityRecognitionPermission();
      const highSamplingPermission = await requestHighSamplingRatePermission();

      if (!activityPermission) {
        console.warn('활동 인식 권한이 없습니다.');
      }

      if (!highSamplingPermission) {
        console.warn(
          '고속 샘플링 권한이 없습니다. 기본 샘플링 레이트를 사용합니다.',
        );
      }

      // 저장된 오늘 걸음수 불러오기
      await this.loadTodaySteps();

      // 샘플링 레이트 설정
      try {
        if (highSamplingPermission) {
          // 고속 샘플링 레이트 설정
          setUpdateIntervalForType(SensorTypes.accelerometer, 0);
          console.log('고속 샘플링 레이트 설정 완료 (0ms)');
        } else {
          // 기본 샘플링 레이트 설정
          setUpdateIntervalForType(SensorTypes.accelerometer, 100);
          console.log('기본 샘플링 레이트 설정 완료 (100ms)');
        }
      } catch (samplingError) {
        console.log(
          '샘플링 레이트 설정 실패, 라이브러리 기본값 사용:',
          samplingError,
        );
      }

      // 가속도계 구독
      this.subscription = accelerometer.subscribe(({ x, y, z }) => {
        this.detectStep(x, y, z);
      });

      this.isTracking = true;
      console.log('React Native 걸음수 추적 시작');

      return { success: true, message: 'Tracking started' };
    } catch (error) {
      console.error('걸음수 추적 시작 실패:', error);
      return { success: false, message: `Failed to start tracking: ${error}` };
    }
  }

  // 걸음수 추적 중지
  async stopTracking(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.isTracking) {
        return { success: true, message: 'Not tracking' };
      }

      // 구독 해제
      if (this.subscription) {
        this.subscription.unsubscribe();
        this.subscription = null;
      }

      // 현재 데이터 저장
      await this.saveTodaySteps();

      this.isTracking = false;
      console.log('React Native 걸음수 추적 중지');

      return { success: true, message: 'Tracking stopped' };
    } catch (error) {
      console.error('걸음수 추적 중지 실패:', error);
      return { success: false, message: 'Failed to stop tracking' };
    }
  }

  // 걸음 감지 알고리즘
  private detectStep(x: number, y: number, z: number) {
    try {
      // 벡터 크기 계산
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const lastMagnitude = Math.sqrt(
        this.lastAcceleration.x * this.lastAcceleration.x +
          this.lastAcceleration.y * this.lastAcceleration.y +
          this.lastAcceleration.z * this.lastAcceleration.z,
      );

      // 변화량 계산
      const delta = Math.abs(magnitude - lastMagnitude);

      // 임계값을 넘으면 걸음으로 감지
      if (delta > this.threshold) {
        this.stepCount++;
        this.saveTodaySteps();
        console.log(`걸음 감지: ${this.stepCount}보`);
      }

      // 현재 가속도 저장
      this.lastAcceleration = { x, y, z };
    } catch (error) {
      console.error('걸음 감지 에러:', error);
    }
  }

  // 오늘 데이터 조회
  async getTodayData(): Promise<StepData> {
    try {
      await this.loadTodaySteps();

      return {
        steps: this.stepCount,
        calories: this.stepCount * this.caloriesPerStep,
        distance: (this.stepCount * this.stepLength) / 1000, // km
        date: this.getCurrentDate(),
      };
    } catch (error) {
      console.error('오늘 데이터 조회 실패:', error);
      return {
        steps: 0,
        calories: 0,
        distance: 0,
        date: this.getCurrentDate(),
      };
    }
  }

  // 날짜별 데이터 조회
  async getDataByDate(date: string): Promise<StepData> {
    try {
      const key = `step_data_${date}`;
      const data = await AsyncStorage.getItem(key);

      if (data) {
        return JSON.parse(data);
      }

      return {
        steps: 0,
        calories: 0,
        distance: 0,
        date,
      };
    } catch (error) {
      console.error('날짜별 데이터 조회 실패:', error);
      return {
        steps: 0,
        calories: 0,
        distance: 0,
        date,
      };
    }
  }

  // 기간별 데이터 조회
  async getDataByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<StepData[]> {
    try {
      const results: StepData[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + 1)
      ) {
        const dateStr = date.toISOString().split('T')[0];
        const data = await this.getDataByDate(dateStr);
        results.push(data);
      }

      return results;
    } catch (error) {
      console.error('기간별 데이터 조회 실패:', error);
      return [];
    }
  }

  // 오늘 데이터 리셋
  async resetTodayData(): Promise<{ success: boolean; message: string }> {
    try {
      this.stepCount = 0;
      await this.saveTodaySteps();

      return { success: true, message: "Today's data reset" };
    } catch (error) {
      console.error('데이터 리셋 실패:', error);
      return { success: false, message: 'Failed to reset data' };
    }
  }

  // 트래커 초기화
  async initializeTracker(): Promise<{
    success: boolean;
    stepSensorAvailable: boolean;
    accelerometerAvailable: boolean;
    todaySteps: number;
  }> {
    try {
      await this.loadTodaySteps();

      return {
        success: true,
        stepSensorAvailable: false, // React Native Sensors는 가속도계만 사용
        accelerometerAvailable: true,
        todaySteps: this.stepCount,
      };
    } catch (error) {
      console.error('트래커 초기화 실패:', error);
      return {
        success: false,
        stepSensorAvailable: false,
        accelerometerAvailable: false,
        todaySteps: 0,
      };
    }
  }

  // 오늘 걸음수 저장
  private async saveTodaySteps() {
    try {
      const today = this.getCurrentDate();
      const data: StepData = {
        steps: this.stepCount,
        calories: this.stepCount * this.caloriesPerStep,
        distance: (this.stepCount * this.stepLength) / 1000,
        date: today,
      };

      const key = `step_data_${today}`;
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('걸음수 저장 실패:', error);
    }
  }

  // 오늘 걸음수 불러오기
  private async loadTodaySteps() {
    try {
      const today = this.getCurrentDate();
      const data = await this.getDataByDate(today);
      this.stepCount = data.steps;
    } catch (error) {
      console.error('걸음수 불러오기 실패:', error);
      this.stepCount = 0;
    }
  }

  // 현재 날짜 문자열 반환
  private getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // 추적 상태 확인
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }

  // 현재 걸음수 반환
  getCurrentSteps(): number {
    return this.stepCount;
  }
}

// 싱글톤 인스턴스
export const reactNativeStepTrackerService =
  new ReactNativeStepTrackerService();
