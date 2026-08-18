import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import nativeStepTrackerService, {
  StepData,
} from '../services/nativeStepTrackerService';

export const useNativeStepTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [stepData, setStepData] = useState<StepData>({
    steps: 0,
    calories: 0,
    distance: 0,
    date: new Date().toISOString().split('T')[0],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModuleAvailable, setIsModuleAvailable] = useState(false);

  // 네이티브 모듈 사용 가능 여부 확인
  useEffect(() => {
    const available = nativeStepTrackerService.isModuleAvailable();
    setIsModuleAvailable(available);
    console.log('네이티브 StepTracker 모듈 사용 가능:', available);
  }, []);

  // 오늘 데이터 로드
  const loadTodayData = useCallback(async () => {
    if (!isModuleAvailable) return;

    try {
      setIsLoading(true);
      const data = await nativeStepTrackerService.getTodayData();
      setStepData(data);
      setError(null);
    } catch (err) {
      setError(`데이터 로드 실패: ${err}`);
      console.error('데이터 로드 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isModuleAvailable]);

  // 걸음수 추적 시작
  const startTracking = useCallback(async () => {
    if (!isModuleAvailable) {
      setError('네이티브 모듈을 사용할 수 없습니다');
      return;
    }

    try {
      setIsLoading(true);
      const result = await nativeStepTrackerService.startTracking();

      if (result.success) {
        setIsTracking(true);
        setError(null);
        console.log('걸음수 추적 시작 성공');
      } else {
        setError(result.message);
        console.error('걸음수 추적 시작 실패:', result.message);
      }
    } catch (err) {
      setError(`추적 시작 실패: ${err}`);
      console.error('추적 시작 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isModuleAvailable]);

  // 걸음수 추적 중지
  const stopTracking = useCallback(async () => {
    if (!isModuleAvailable) return;

    try {
      setIsLoading(true);
      const result = await nativeStepTrackerService.stopTracking();

      if (result.success) {
        setIsTracking(false);
        setError(null);
        // 추적 중지 후 최신 데이터 로드
        await loadTodayData();
        console.log('걸음수 추적 중지 성공');
      } else {
        setError(result.message);
        console.error('걸음수 추적 중지 실패:', result.message);
      }
    } catch (err) {
      setError(`추적 중지 실패: ${err}`);
      console.error('추적 중지 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isModuleAvailable, loadTodayData]);

  // 데이터 리셋
  const resetData = useCallback(async () => {
    if (!isModuleAvailable) return;

    try {
      setIsLoading(true);
      const result = await nativeStepTrackerService.resetTodayData();

      if (result.success) {
        await loadTodayData();
        setError(null);
        console.log('데이터 리셋 성공');
      } else {
        setError(result.message);
        console.error('데이터 리셋 실패:', result.message);
      }
    } catch (err) {
      setError(`데이터 리셋 실패: ${err}`);
      console.error('데이터 리셋 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isModuleAvailable, loadTodayData]);

  // 데이터 새로고침
  const refreshData = useCallback(async () => {
    await loadTodayData();
  }, [loadTodayData]);

  // 앱 상태 변경 처리
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // 앱이 활성화되면 데이터 새로고침
        loadTodayData();
      }
    };

    const subscription = AppState.addEventListener(
      'change',
      handleAppStateChange,
    );

    return () => {
      subscription?.remove();
    };
  }, [loadTodayData]);

  // 초기 데이터 로드
  useEffect(() => {
    if (isModuleAvailable) {
      loadTodayData();
    }
  }, [isModuleAvailable, loadTodayData]);

  // 주기적 데이터 업데이트 (추적 중일 때)
  useEffect(() => {
    if (!isTracking || !isModuleAvailable) return;

    const interval = setInterval(() => {
      loadTodayData();
    }, 2000); // 2초마다 데이터 업데이트

    return () => clearInterval(interval);
  }, [isTracking, isModuleAvailable, loadTodayData]);

  return {
    // 상태
    isTracking,
    stepData,
    isLoading,
    error,
    isModuleAvailable,

    // 액션
    startTracking,
    stopTracking,
    resetData,
    refreshData,

    // 계산된 값
    goalProgress: Math.min((stepData.steps / 10000) * 100, 100), // 10000보 목표 기준
    todaySteps: stepData.steps,
    todayCalories: stepData.calories,
    todayDistance: stepData.distance,
  };
};
