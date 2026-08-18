import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import stepTrackerService from '../services/stepTrackerService';
import type {
  DailyStepData,
  StepDataUpdateEvent,
  StepTrackerInitResult,
} from '../types/stepTracker';

interface UseStepTrackerOptions {
  autoStart?: boolean;
  dailyGoal?: number;
  updateInterval?: number;
}

interface UseStepTrackerReturn {
  // 상태
  isInitialized: boolean;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;

  // 데이터
  todayData: DailyStepData | null;
  initResult: StepTrackerInitResult | null;

  // 목표 관련
  goalProgress: number;
  goalAchieved: boolean;
  remainingSteps: number;

  // 메서드
  initialize: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  refreshData: () => Promise<void>;
  resetTodayData: () => Promise<void>;
  getDataByDate: (date: string) => Promise<DailyStepData>;
  getWeeklyData: () => Promise<DailyStepData[]>;
  getMonthlyData: () => Promise<DailyStepData[]>;
}

export const useStepTracker = (
  options: UseStepTrackerOptions = {},
): UseStepTrackerReturn => {
  const {
    autoStart = true,
    dailyGoal = 10000,
    updateInterval = 5000, // 5초마다 업데이트
  } = options;

  // 상태 관리
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayData, setTodayData] = useState<DailyStepData | null>(null);
  const [initResult, setInitResult] = useState<StepTrackerInitResult | null>(
    null,
  );

  // 목표 관련 계산된 값
  const goalProgress = todayData ? Math.min(todayData.steps / dailyGoal, 1) : 0;
  const goalAchieved = todayData ? todayData.steps >= dailyGoal : false;
  const remainingSteps = todayData
    ? Math.max(dailyGoal - todayData.steps, 0)
    : dailyGoal;

  // Refs
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepDataListenerRef = useRef<(() => void) | null>(null);

  // 에러 처리 헬퍼
  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error?.message || `Failed to ${operation}`;
    setError(errorMessage);
    console.error(`StepTracker ${operation} error:`, error);
  }, []);

  // AsyncStorage 백업 키
  const getStorageKey = (date?: string) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return `StepTracker_${targetDate}`;
  };

  // 데이터 백업
  const backupData = useCallback(async (data: DailyStepData) => {
    try {
      await AsyncStorage.setItem(
        getStorageKey(data.date),
        JSON.stringify(data),
      );
    } catch (error) {
      console.warn('Failed to backup step data:', error);
    }
  }, []);

  // 데이터 복구
  const restoreData = useCallback(
    async (date?: string): Promise<DailyStepData | null> => {
      try {
        const stored = await AsyncStorage.getItem(getStorageKey(date));
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.warn('Failed to restore step data:', error);
        return null;
      }
    },
    [],
  );

  // 초기화
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await stepTrackerService.initialize();
      setInitResult(result);
      setIsInitialized(true);

      // 오늘 데이터 로드
      await refreshData();

      console.log('StepTracker initialized:', result);
    } catch (error) {
      handleError(error, 'initialize');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // 추적 시작
  const startTracking = useCallback(async () => {
    try {
      setError(null);
      await stepTrackerService.startTracking();
      setIsTracking(true);

      // 실시간 업데이트 리스너 등록
      if (stepDataListenerRef.current) {
        stepDataListenerRef.current();
      }

      stepDataListenerRef.current = stepTrackerService.addStepDataListener(
        (data: StepDataUpdateEvent) => {
          setTodayData(prev =>
            prev
              ? {
                  ...prev,
                  steps: data.steps,
                  calories: data.calories,
                  distance: data.distance,
                }
              : null,
          );
        },
      );

      // 주기적 업데이트 시작
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }

      updateIntervalRef.current = setInterval(async () => {
        try {
          await refreshData();
        } catch (error) {
          console.warn('Periodic update failed:', error);
        }
      }, updateInterval);
    } catch (error) {
      handleError(error, 'start tracking');
    }
  }, [updateInterval, handleError]);

  // 추적 중지
  const stopTracking = useCallback(async () => {
    try {
      setError(null);
      await stepTrackerService.stopTracking();
      setIsTracking(false);

      // 리스너 제거
      if (stepDataListenerRef.current) {
        stepDataListenerRef.current();
        stepDataListenerRef.current = null;
      }

      // 주기적 업데이트 중지
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    } catch (error) {
      handleError(error, 'stop tracking');
    }
  }, [handleError]);

  // 데이터 새로고침
  const refreshData = useCallback(async () => {
    try {
      const data = await stepTrackerService.getTodayData();

      // 네이티브에서 데이터가 비어있으면 백업에서 복구 시도
      if (!data || data.steps === 0) {
        const restoredData = await restoreData();
        if (restoredData && restoredData.steps > 0) {
          console.log('Restored step data from backup:', restoredData);
          setTodayData(restoredData);
          return;
        }
      }

      setTodayData(data);

      // 데이터가 있으면 백업 저장
      if (data && data.steps > 0) {
        await backupData(data);
      }
    } catch (error) {
      // 네이티브 모듈 에러 시 백업에서 복구
      console.warn('Native module error, trying backup restore:', error);
      try {
        const restoredData = await restoreData();
        if (restoredData) {
          setTodayData(restoredData);
          return;
        }
      } catch (restoreError) {
        console.warn('Failed to restore from backup:', restoreError);
      }
      handleError(error, 'refresh data');
    }
  }, [handleError, restoreData, backupData]);

  // 오늘 데이터 리셋
  const resetTodayData = useCallback(async () => {
    try {
      setError(null);
      await stepTrackerService.resetTodayData();
      await refreshData();
    } catch (error) {
      handleError(error, 'reset today data');
    }
  }, [handleError, refreshData]);

  // 특정 날짜 데이터 조회
  const getDataByDate = useCallback(
    async (date: string): Promise<DailyStepData> => {
      try {
        return await stepTrackerService.getDataByDate(date);
      } catch (error) {
        handleError(error, 'get data by date');
        throw error;
      }
    },
    [handleError],
  );

  // 주간 데이터 조회
  const getWeeklyData = useCallback(async (): Promise<DailyStepData[]> => {
    try {
      return await stepTrackerService.getWeeklyData();
    } catch (error) {
      handleError(error, 'get weekly data');
      throw error;
    }
  }, [handleError]);

  // 월간 데이터 조회
  const getMonthlyData = useCallback(async (): Promise<DailyStepData[]> => {
    try {
      return await stepTrackerService.getMonthlyData();
    } catch (error) {
      handleError(error, 'get monthly data');
      throw error;
    }
  }, [handleError]);

  // AppState 변경 처리
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && isTracking) {
        // 앱이 활성화되면 데이터 새로고침
        refreshData();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );
    return () => subscription?.remove();
  }, [isTracking, refreshData]);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // 자동 시작
  useEffect(() => {
    if (isInitialized && autoStart && !isTracking) {
      startTracking();
    }
  }, [isInitialized, autoStart, isTracking, startTracking]);

  // 클린업
  useEffect(() => {
    return () => {
      if (stepDataListenerRef.current) {
        stepDataListenerRef.current();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      stepTrackerService.removeAllListeners();
    };
  }, []);

  return {
    // 상태
    isInitialized,
    isTracking,
    isLoading,
    error,

    // 데이터
    todayData,
    initResult,

    // 목표 관련
    goalProgress,
    goalAchieved,
    remainingSteps,

    // 메서드
    initialize,
    startTracking,
    stopTracking,
    refreshData,
    resetTodayData,
    getDataByDate,
    getWeeklyData,
    getMonthlyData,
  };
};
