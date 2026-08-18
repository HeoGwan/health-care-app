import { NativeModules } from 'react-native';

const { StepTrackerModule } = NativeModules;

export interface StepData {
  steps: number;
  calories: number;
  distance: number;
  date: string;
}

export interface StepTrackerResponse {
  success: boolean;
  message: string;
}

class NativeStepTrackerService {
  // 걸음수 추적 시작
  async startTracking(): Promise<StepTrackerResponse> {
    try {
      if (!StepTrackerModule) {
        return { success: false, message: 'StepTrackerModule not available' };
      }

      const result = await StepTrackerModule.startTracking();
      console.log('네이티브 걸음수 추적 시작:', result);
      return result;
    } catch (error) {
      console.error('걸음수 추적 시작 실패:', error);
      return { success: false, message: `Failed to start tracking: ${error}` };
    }
  }

  // 걸음수 추적 중지
  async stopTracking(): Promise<StepTrackerResponse> {
    try {
      if (!StepTrackerModule) {
        return { success: false, message: 'StepTrackerModule not available' };
      }

      const result = await StepTrackerModule.stopTracking();
      console.log('네이티브 걸음수 추적 중지:', result);
      return result;
    } catch (error) {
      console.error('걸음수 추적 중지 실패:', error);
      return { success: false, message: `Failed to stop tracking: ${error}` };
    }
  }

  // 오늘 데이터 조회
  async getTodayData(): Promise<StepData> {
    try {
      if (!StepTrackerModule) {
        return {
          steps: 0,
          calories: 0,
          distance: 0,
          date: new Date().toISOString().split('T')[0],
        };
      }

      const result = await StepTrackerModule.getTodayData();
      console.log('오늘 걸음수 데이터:', result);
      return result;
    } catch (error) {
      console.error('데이터 조회 실패:', error);
      return {
        steps: 0,
        calories: 0,
        distance: 0,
        date: new Date().toISOString().split('T')[0],
      };
    }
  }

  // 데이터 리셋
  async resetTodayData(): Promise<StepTrackerResponse> {
    try {
      if (!StepTrackerModule) {
        return { success: false, message: 'StepTrackerModule not available' };
      }

      const result = await StepTrackerModule.resetTodayData();
      console.log('데이터 리셋:', result);
      return result;
    } catch (error) {
      console.error('데이터 리셋 실패:', error);
      return { success: false, message: `Failed to reset data: ${error}` };
    }
  }

  // 추적 상태 확인
  isModuleAvailable(): boolean {
    return !!StepTrackerModule;
  }
}

export default new NativeStepTrackerService();
