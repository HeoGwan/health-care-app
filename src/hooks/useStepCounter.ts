import { useState, useEffect, useRef } from 'react';
import stepService, { StepData } from '../services/androidStepService';

export const useStepCounter = (userWeight?: number) => {
  const [stepData, setStepData] = useState<StepData>({
    steps: 0,
    distance: 0,
    calories: 0,
    timestamp: new Date(),
  });
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 걸음 추적 시작
  const startTracking = async () => {
    try {
      setError(null);

      // 권한 확인
      const hasPermission = await stepService.requestPermissions();
      if (!hasPermission) {
        setError('센서 권한이 필요합니다.');
        return;
      }

      // 센서 지원 여부 확인
      if (!stepService.isStepSensorAvailable()) {
        setError('이 디바이스는 걸음 센서를 지원하지 않습니다.');
        return;
      }

      // 걸음 추적 시작
      await stepService.startStepTracking();
      setIsTracking(true);

      // 1초마다 걸음 데이터 업데이트
      intervalRef.current = setInterval(() => {
        const currentData = stepService.getCurrentStepData(userWeight);
        setStepData(currentData);
      }, 1000);
    } catch (err) {
      setError(`걸음 추적 시작 실패: ${err}`);
    }
  };

  // 걸음 추적 중지
  const stopTracking = () => {
    stepService.stopStepTracking();
    setIsTracking(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 걸음 수 초기화
  const resetSteps = () => {
    stepService.resetStepCount();
    setStepData({
      steps: 0,
      distance: 0,
      calories: 0,
      timestamp: new Date(),
    });
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    stepData,
    isTracking,
    error,
    startTracking,
    stopTracking,
    resetSteps,
  };
};
