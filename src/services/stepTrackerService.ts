import {
  NativeModules,
  NativeEventEmitter,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import type {
  StepTrackerModule as StepTrackerModuleType,
  DailyStepData,
  StepTrackerInitResult,
  StepDataUpdateEvent,
} from '../types/stepTracker';

const { StepTrackerModule } = NativeModules;

class StepTrackerService {
  private eventEmitter: NativeEventEmitter | null = null;
  private isInitialized = false;
  private listeners: { [key: string]: any } = {};

  constructor() {
    if (StepTrackerModule) {
      // Cross-platform: use StepTrackerModule if available (Android/iOS)
      this.eventEmitter = new NativeEventEmitter(StepTrackerModule);
    } else {
      console.warn('StepTrackerModule not available on this platform');
    }
  }

  /**
   * 스텝 트래커 초기화
   */
  async initialize(): Promise<StepTrackerInitResult> {
    try {
      if (!StepTrackerModule) {
        throw new Error('StepTrackerModule is not available');
      }

      const result = await StepTrackerModule.initializeTracker();
      this.isInitialized = true;
      return result;
    } catch (error) {
      console.error('StepTracker initialization failed:', error);
      throw error;
    }
  }

  /**
   * 걸음수 추적 시작
   */
  async startTracking(): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const result = await StepTrackerModule.startTracking();
      console.log('Step tracking started:', result);
      return result;
    } catch (error) {
      console.error('Failed to start step tracking:', error);
      throw error;
    }
  }

  /**
   * 걸음수 추적 중지
   */
  async stopTracking(): Promise<string> {
    try {
      if (!StepTrackerModule) {
        throw new Error('StepTrackerModule is not available');
      }

      const result = await StepTrackerModule.stopTracking();
      console.log('Step tracking stopped:', result);
      return result;
    } catch (error) {
      console.error('Failed to stop step tracking:', error);
      throw error;
    }
  }

  /**
   * 오늘의 걸음수 데이터 조회
   */
  async getTodayData(): Promise<DailyStepData> {
    try {
      if (!StepTrackerModule) {
        throw new Error('StepTrackerModule is not available');
      }

      return await StepTrackerModule.getTodayData();
    } catch (error) {
      console.error('Failed to get today data:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 걸음수 데이터 조회
   */
  async getDataByDate(date: string): Promise<DailyStepData> {
    try {
      if (!StepTrackerModule) {
        throw new Error('StepTrackerModule is not available');
      }

      return await StepTrackerModule.getDataByDate(date);
    } catch (error) {
      console.error('Failed to get data by date:', error);
      throw error;
    }
  }

  /**
   * 날짜 범위의 걸음수 데이터 조회
   */
  async getDataByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<DailyStepData[]> {
    try {
      if (!StepTrackerModule) {
        console.warn(
          'StepTrackerModule not available - returning empty date range data',
        );
        return [];
      }

      return await StepTrackerModule.getDataByDateRange(startDate, endDate);
    } catch (error) {
      console.error('Failed to get data by date range:', error);
      // 에러 시 빈 배열 반환하여 앱 크래시 방지
      return [];
    }
  }

  /**
   * 오늘의 데이터 리셋
   */
  async resetTodayData(): Promise<string> {
    try {
      if (!StepTrackerModule) {
        throw new Error('StepTrackerModule is not available');
      }

      return await StepTrackerModule.resetTodayData();
    } catch (error) {
      console.error('Failed to reset today data:', error);
      throw error;
    }
  }

  /**
   * 센서 상태 확인
   */
  async getSensorStatus(): Promise<any> {
    try {
      if (!StepTrackerModule) {
        throw new Error('StepTrackerModule is not available');
      }

      return await StepTrackerModule.getSensorStatus();
    } catch (error) {
      console.error('Failed to get sensor status:', error);
      throw error;
    }
  }

  /**
   * 걸음수 업데이트 이벤트 리스너 등록
   */
  addStepDataListener(
    callback: (data: StepDataUpdateEvent) => void,
  ): () => void {
    if (!this.eventEmitter) {
      console.warn('Event emitter not available');
      return () => {};
    }

    const subscription = this.eventEmitter.addListener(
      'stepDataUpdated',
      callback,
    );
    const listenerId = Math.random().toString(36).substr(2, 9);
    this.listeners[listenerId] = subscription;

    return () => {
      if (this.listeners[listenerId]) {
        this.listeners[listenerId].remove();
        delete this.listeners[listenerId];
      }
    };
  }

  /**
   * 모든 이벤트 리스너 제거
   */
  removeAllListeners(): void {
    Object.values(this.listeners).forEach((listener: any) => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.listeners = {};
  }

  /**
   * 날짜 포맷 유틸리티 (YYYY-MM-DD)
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 오늘 날짜 가져오기
   */
  getTodayDate(): string {
    return this.formatDate(new Date());
  }

  /**
   * 어제 날짜 가져오기
   */
  getYesterdayDate(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.formatDate(yesterday);
  }

  /**
   * 주간 데이터 가져오기 (지난 7일) - 걸음수가 0인 데이터는 제외
   */
  async getWeeklyData(): Promise<DailyStepData[]> {
    try {
      const endDate = this.getTodayDate();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      const formattedStartDate = this.formatDate(startDate);

      const allData = await this.getDataByDateRange(
        formattedStartDate,
        endDate,
      );

      // 유효한 걸음수 데이터만 필터링
      const validData = this.filterValidStepData(allData);

      console.log(
        `주간 데이터: 전체 ${allData.length}개 중 유효한 데이터 ${validData.length}개`,
      );

      return validData;
    } catch (error) {
      console.error('Failed to get weekly data:', error);
      return [];
    }
  }

  /**
   * 월간 데이터 가져오기 (지난 30일) - 걸음수가 0인 데이터는 제외
   */
  async getMonthlyData(): Promise<DailyStepData[]> {
    try {
      // StepTrackerModule이 없는 경우 빈 배열 반환 (iOS에서 모듈이 구현되지 않은 경우)
      if (!StepTrackerModule) {
        console.warn(
          'StepTrackerModule not available - returning empty monthly data',
        );
        return [];
      }

      const endDate = this.getTodayDate();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      const formattedStartDate = this.formatDate(startDate);

      const allData = await this.getDataByDateRange(
        formattedStartDate,
        endDate,
      );

      // 유효한 걸음수 데이터만 필터링
      const validData = this.filterValidStepData(allData);

      console.log(
        `월간 데이터: 전체 ${allData.length}개 중 유효한 데이터 ${validData.length}개`,
      );

      return validData;
    } catch (error) {
      console.error('Failed to get monthly data:', error);
      // 에러 발생 시 빈 배열 반환하여 앱 크래시 방지
      return [];
    }
  }

  /**
   * 걸음수 목표 달성 여부 확인
   */
  async checkDailyGoal(goalSteps: number = 10000): Promise<{
    achieved: boolean;
    progress: number;
    remaining: number;
  }> {
    const todayData = await this.getTodayData();
    const progress = Math.min(todayData.steps / goalSteps, 1);
    const achieved = todayData.steps >= goalSteps;
    const remaining = Math.max(goalSteps - todayData.steps, 0);

    return {
      achieved,
      progress,
      remaining,
    };
  }

  /**
   * 평균 걸음수 계산
   */
  calculateAverageSteps(data: DailyStepData[]): number {
    if (data.length === 0) return 0;
    const totalSteps = data.reduce((sum, day) => sum + day.steps, 0);
    return Math.round(totalSteps / data.length);
  }

  /**
   * 총 걸음수 계산
   */
  calculateTotalSteps(data: DailyStepData[]): number {
    return data.reduce((sum, day) => sum + day.steps, 0);
  }

  /**
   * 총 칼로리 계산
   */
  calculateTotalCalories(data: DailyStepData[]): number {
    return data.reduce((sum, day) => sum + day.calories, 0);
  }

  /**
   * 총 거리 계산
   */
  calculateTotalDistance(data: DailyStepData[]): number {
    return data.reduce((sum, day) => sum + day.distance, 0);
  }

  /**
   * 유효한 걸음수 데이터인지 확인 (0보다 크고 비현실적이지 않은 값, 날짜 유효성)
   */
  isValidStepData(data: DailyStepData): boolean {
    // 걸음수가 0보다 크고 100,000보다 작은 경우만 유효한 데이터로 간주
    // 날짜가 비어있지 않은지도 확인
    return (
      data.steps > 0 &&
      data.steps < 100000 &&
      data.date &&
      data.date.trim() !== '' &&
      data.date.length >= 10 // yyyy-MM-dd 형식 최소 길이
    );
  }

  /**
   * 유효한 걸음수 데이터만 필터링
   */
  filterValidStepData(data: DailyStepData[]): DailyStepData[] {
    return data.filter(item => this.isValidStepData(item));
  }

  /**
   * SQLite 데이터베이스의 모든 데이터 조회 (디버깅용)
   */
  async getAllDatabaseData(): Promise<DailyStepData[]> {
    try {
      if (!this.isInitialized) {
        throw new Error('StepTracker not initialized');
      }

      if (!StepTrackerModule.getAllDatabaseData) {
        throw new Error('getAllDatabaseData method not available');
      }

      const result = await StepTrackerModule.getAllDatabaseData();
      return result;
    } catch (error) {
      console.error('Failed to get all database data:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 모든 데이터 삭제
   */
  async clearAllDatabaseData(): Promise<string> {
    try {
      if (!StepTrackerModule) {
        throw new Error('StepTrackerModule is not available');
      }

      if (!StepTrackerModule.clearAllDatabaseData) {
        console.warn(
          'clearAllDatabaseData method not available on this platform',
        );
        return 'Method not available';
      }

      const result = await StepTrackerModule.clearAllDatabaseData();
      console.log('✅ Database cleared successfully');
      return result;
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw error;
    }
  }
}

export default new StepTrackerService();
