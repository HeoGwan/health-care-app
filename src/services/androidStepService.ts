import { Platform, PermissionsAndroid } from 'react-native';
// @ts-ignore - react-native-sensors doesn't have TypeScript definitions
import { accelerometer } from 'react-native-sensors';
import { map, filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

export interface StepData {
  steps: number;
  distance: number; // 미터 단위
  calories: number; // 대략적인 소모 칼로리
  timestamp: Date;
}

interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

class AndroidStepService {
  private stepCount = 0;
  private lastTimestamp = Date.now();
  private stepThreshold = 1.2; // 걸음 감지 임계값
  private isTracking = false;
  private subscription: Subscription | null = null;

  // 걸음 수 추적 시작
  startStepTracking(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (Platform.OS !== 'android') {
        reject('Android 플랫폼에서만 지원됩니다.');
        return;
      }

      if (this.isTracking) {
        resolve(true);
        return;
      }

      try {
        this.subscription = accelerometer
          .pipe(
            map(({ x, y, z }: AccelerometerData) =>
              Math.sqrt(x * x + y * y + z * z),
            ),
            filter((acceleration: number) => acceleration > this.stepThreshold),
          )
          .subscribe(
            (_acceleration: number) => {
              const currentTime = Date.now();
              // 최소 300ms 간격으로 걸음 감지 (너무 빠른 중복 방지)
              if (currentTime - this.lastTimestamp > 300) {
                this.stepCount++;
                this.lastTimestamp = currentTime;
              }
            },
            (error: any) => {
              console.error('걸음 수 센서 오류:', error);
              reject(error);
            },
          );

        this.isTracking = true;
        resolve(true);
      } catch (error) {
        reject('센서 초기화 실패: ' + error);
      }
    });
  }

  // 걸음 수 추적 중지
  stopStepTracking(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
    this.isTracking = false;
  }

  // 현재 걸음 수 반환
  getCurrentSteps(): number {
    return this.stepCount;
  }

  // 걸음 수 초기화
  resetStepCount(): void {
    this.stepCount = 0;
    this.lastTimestamp = Date.now();
  }

  // 걸음 수 기반으로 거리 계산 (평균 보폭 70cm 기준)
  calculateDistance(steps: number): number {
    const averageStepLength = 0.7; // 미터
    return steps * averageStepLength;
  }

  // 걸음 수 기반으로 소모 칼로리 계산 (대략적)
  calculateCalories(steps: number, weightKg: number = 70): number {
    // 1걸음당 약 0.04 칼로리 소모 (평균 70kg 기준)
    const caloriesPerStep = 0.04 * (weightKg / 70);
    return Math.round(steps * caloriesPerStep);
  }

  // 현재 걸음 데이터 전체 반환
  getCurrentStepData(userWeight?: number): StepData {
    const steps = this.getCurrentSteps();
    return {
      steps,
      distance: this.calculateDistance(steps),
      calories: this.calculateCalories(steps, userWeight),
      timestamp: new Date(),
    };
  }

  // 권한 확인 및 요청
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Android 10 (API 29) 이상에서는 ACTIVITY_RECOGNITION 권한 필요
      if (Platform.Version >= 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          {
            title: '활동 인식 권한',
            message: '걸음 수를 추적하기 위해 활동 인식 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          },
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      return true;
    } catch (error) {
      console.error('권한 요청 실패:', error);
      return false;
    }
  }

  // 디바이스가 걸음 센서를 지원하는지 확인
  isStepSensorAvailable(): boolean {
    return Platform.OS === 'android';
  }
}

// 싱글톤 인스턴스
const stepService = new AndroidStepService();

export default stepService;
