import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  reactNativeStepTrackerService,
  StepData,
} from '../services/reactNativeStepTrackerService';

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
  todayData: StepData | null;

  // 목표 관련
  goalProgress: number;
  goalAchieved: boolean;
  dailyGoal: number;

  // 액션
  initialize: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  refreshData: () => Promise<void>;
  resetTodayData: () => Promise<void>;
  getDataByDate: (date: string) => Promise<StepData>;
  getDataByDateRange: (
    startDate: string,
    endDate: string,
  ) => Promise<StepData[]>;
  setDailyGoal: (goal: number) => Promise<void>;
}

const DEFAULT_DAILY_GOAL = 10000;

export const useReactNativeStepTracker = (
  options: UseStepTrackerOptions = {},
): UseStepTrackerReturn => {
  const {
    autoStart = true,
    dailyGoal: initialDailyGoal = DEFAULT_DAILY_GOAL,
    updateInterval = 1000,
  } = options;

  // 상태
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayData, setTodayData] = useState<StepData | null>(null);
  const [dailyGoal, setDailyGoalState] = useState(initialDailyGoal);

  // 참조
  const updateIntervalRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // 에러 처리
  const handleError = useCallback((error: any, context: string) => {
    const message = error?.message || error?.toString() || 'Unknown error';
    console.error(`Step tracker error (${context}):`, error);
    setError(`${context}: ${message}`);
  }, []);

  // 목표 관련 계산
  const goalProgress = todayData
    ? Math.min((todayData.steps / dailyGoal) * 100, 100)
    : 0;
  const goalAchieved = todayData ? todayData.steps >= dailyGoal : false;

  // 데이터 새로고침
  const refreshData = useCallback(async () => {
    try {
      const data = await reactNativeStepTrackerService.getTodayData();
      setTodayData(data);

      // 데이터가 있으면 백업 저장
      if (data && data.steps > 0) {
        const backupKey = `step_backup_${data.date}`;
        await AsyncStorage.setItem(backupKey, JSON.stringify(data));
      }
    } catch (error) {
      // 네이티브 모듈 에러 시 백업에서 복구
      console.warn('React Native 센서 에러, 백업 복구 시도:', error);
      try {
        const today = new Date().toISOString().split('T')[0];
        const backupKey = `step_backup_${today}`;
        const backupData = await AsyncStorage.getItem(backupKey);
        if (backupData) {
          const restoredData = JSON.parse(backupData);
          setTodayData(restoredData);
          return;
        }
      } catch (restoreError) {
        console.warn('백업 복구 실패:', restoreError);
      }
      handleError(error, 'refresh data');
    }
  }, [handleError]);

  // 트래커 초기화
  const initialize = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('React Native 걸음수 트래커 초기화 시작');

      const result = await reactNativeStepTrackerService.initializeTracker();

      if (result.success) {
        setIsInitialized(true);
        await refreshData();
        console.log('React Native 걸음수 트래커 초기화 완료');
      } else {
        throw new Error('트래커 초기화 실패');
      }
    } catch (error) {
      handleError(error, 'initialize tracker');
    } finally {
      setIsLoading(false);
    }
  }, [refreshData, handleError]);

  // 추적 시작
  const startTracking = useCallback(async () => {
    try {
      setError(null);

      const result = await reactNativeStepTrackerService.startTracking();

      if (result.success) {
        setIsTracking(true);

        // 주기적 업데이트 시작
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }

        updateIntervalRef.current = setInterval(refreshData, updateInterval);

        console.log('React Native 걸음수 추적 시작');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      handleError(error, 'start tracking');
    }
  }, [refreshData, updateInterval, handleError]);

  // 추적 중지
  const stopTracking = useCallback(async () => {
    try {
      const result = await reactNativeStepTrackerService.stopTracking();

      if (result.success) {
        setIsTracking(false);

        // 주기적 업데이트 중지
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }

        // 최종 데이터 저장
        await refreshData();

        console.log('React Native 걸음수 추적 중지');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      handleError(error, 'stop tracking');
    }
  }, [refreshData, handleError]);

  // 오늘 데이터 리셋
  const resetTodayData = useCallback(async () => {
    try {
      setError(null);

      const result = await reactNativeStepTrackerService.resetTodayData();

      if (result.success) {
        await refreshData();
        console.log('오늘 데이터 리셋 완료');
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      handleError(error, 'reset today data');
    }
  }, [refreshData, handleError]);

  // 날짜별 데이터 조회
  const getDataByDate = useCallback(
    async (date: string): Promise<StepData> => {
      try {
        return await reactNativeStepTrackerService.getDataByDate(date);
      } catch (error) {
        handleError(error, 'get data by date');
        return {
          steps: 0,
          calories: 0,
          distance: 0,
          date,
        };
      }
    },
    [handleError],
  );

  // 기간별 데이터 조회
  const getDataByDateRange = useCallback(
    async (startDate: string, endDate: string): Promise<StepData[]> => {
      try {
        return await reactNativeStepTrackerService.getDataByDateRange(
          startDate,
          endDate,
        );
      } catch (error) {
        handleError(error, 'get data by date range');
        return [];
      }
    },
    [handleError],
  );

  // 일일 목표 설정
  const setDailyGoal = useCallback(
    async (goal: number) => {
      try {
        setDailyGoalState(goal);
        await AsyncStorage.setItem('daily_step_goal', goal.toString());
        console.log(`일일 목표 설정: ${goal}보`);
      } catch (error) {
        handleError(error, 'set daily goal');
      }
    },
    [handleError],
  );

  // 저장된 일일 목표 불러오기
  const loadDailyGoal = useCallback(async () => {
    try {
      const savedGoal = await AsyncStorage.getItem('daily_step_goal');
      if (savedGoal) {
        setDailyGoalState(parseInt(savedGoal, 10));
      }
    } catch (error) {
      console.warn('일일 목표 불러오기 실패:', error);
    }
  }, []);

  // 앱 상태 변화 처리
  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // 앱이 활성화될 때
        console.log('앱 활성화 - 데이터 새로고침');
        if (isInitialized) {
          await refreshData();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // 앱이 백그라운드로 갈 때
        console.log('앱 백그라운드 - 데이터 저장');
        if (isTracking) {
          await refreshData();
        }
      }
      appStateRef.current = nextAppState;
    },
    [isInitialized, isTracking, refreshData],
  );

  // 초기화 및 정리
  useEffect(() => {
    const initializeApp = async () => {
      await loadDailyGoal();
      await initialize();

      if (autoStart && isInitialized) {
        await startTracking();
      }
    };

    initializeApp();

    // 앱 상태 변화 리스너 등록
    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      // 정리 작업
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      subscription?.remove();

      // 추적 중지
      if (isTracking) {
        reactNativeStepTrackerService.stopTracking();
      }
    };
  }, []); // 빈 의존성 배열로 한 번만 실행

  return {
    // 상태
    isInitialized,
    isTracking,
    isLoading,
    error,

    // 데이터
    todayData,

    // 목표 관련
    goalProgress,
    goalAchieved,
    dailyGoal,

    // 액션
    initialize,
    startTracking,
    stopTracking,
    refreshData,
    resetTodayData,
    getDataByDate,
    getDataByDateRange,
    setDailyGoal,
  };
};
