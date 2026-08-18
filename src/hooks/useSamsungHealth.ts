import { useState, useEffect, useCallback } from 'react';
import samsungHealthService, {
  WalkingData,
} from '../services/samsungHealthService';

export interface UseSamsungHealthReturn {
  // 데이터
  todayData: WalkingData | null;
  weeklySteps: { date: string; steps: number }[];

  // 상태
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // 메서드
  refreshData: () => Promise<void>;
  initializeHealth: () => Promise<boolean>;
  openHealthApp: () => Promise<void>;
}

export const useSamsungHealth = (): UseSamsungHealthReturn => {
  const [todayData, setTodayData] = useState<WalkingData | null>(null);
  const [weeklySteps, setWeeklySteps] = useState<
    { date: string; steps: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 데이터 새로고침
   */
  const refreshData = useCallback(async (): Promise<void> => {
    if (!isInitialized) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // TODO: 메서드 구현 필요
      // const [todayHealthData, weeklyStepsData] = await Promise.all([
      //   samsungHealthService.getTodayHealthData(),
      //   samsungHealthService.getWeeklySteps(),
      // ]);
      // setTodayData(todayHealthData);
      // setWeeklySteps(weeklyStepsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : '데이터를 가져오는 중 오류가 발생했습니다';
      setError(errorMessage);
      console.error('Samsung Health data refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  /**
   * Samsung Health 초기화
   */
  const initializeHealth = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const initialized = await samsungHealthService.initialize();
      setIsInitialized(initialized);

      if (initialized) {
        await refreshData();
      } else {
        setError('Samsung Health 초기화에 실패했습니다');
      }

      return initialized;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Samsung Health 연결 중 오류가 발생했습니다';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [refreshData]);

  /**
   * Samsung Health 앱 열기
   */
  const openHealthApp = useCallback(async (): Promise<void> => {
    try {
      // TODO: 메서드 구현 필요
      // await samsungHealthService.openHealthApp();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Samsung Health 앱을 열 수 없습니다';
      setError(errorMessage);
    }
  }, []);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    const initializeOnMount = async () => {
      // TODO: 메서드 구현 필요
      // const isAppInstalled = await samsungHealthService.isHealthAppInstalled();

      // if (!isAppInstalled) {
      //   setError('Samsung Health 앱이 설치되어 있지 않습니다');
      //   return;
      // }

      // 자동으로 초기화 시도
      await initializeHealth();
    };

    initializeOnMount();
  }, [initializeHealth]);

  // 정기적으로 데이터 업데이트 (5분마다)
  useEffect(() => {
    if (!isInitialized) {
      return;
    }

    const interval = setInterval(() => {
      refreshData();
    }, 5 * 60 * 1000); // 5분

    return () => clearInterval(interval);
  }, [isInitialized, refreshData]);

  return {
    // 데이터
    todayData,
    weeklySteps,

    // 상태
    isLoading,
    isInitialized,
    error,

    // 메서드
    refreshData,
    initializeHealth,
    openHealthApp,
  };
};

export default useSamsungHealth;
