import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useReactNativeStepTracker } from '../hooks/useReactNativeStepTracker';

interface StepTrackerComponentProps {
  dailyGoal?: number;
  autoStart?: boolean;
}

export const ReactNativeStepTrackerComponent: React.FC<
  StepTrackerComponentProps
> = ({ dailyGoal = 10000, autoStart = true }) => {
  const {
    isInitialized,
    isTracking,
    isLoading,
    error,
    todayData,
    goalProgress,
    goalAchieved,
    dailyGoal: currentGoal,
    initialize,
    startTracking,
    stopTracking,
    refreshData,
    resetTodayData,
    setDailyGoal,
  } = useReactNativeStepTracker({ dailyGoal, autoStart });

  const handleResetData = () => {
    Alert.alert(
      '데이터 리셋',
      '오늘의 걸음수 데이터를 모두 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: resetTodayData },
      ],
    );
  };

  const handleSetGoal = () => {
    Alert.prompt(
      '목표 설정',
      '일일 걸음수 목표를 입력하세요',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '설정',
          onPress: value => {
            const goal = parseInt(value || '0', 10);
            if (goal > 0) {
              setDailyGoal(goal);
            }
          },
        },
      ],
      'plain-text',
      currentGoal.toString(),
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>걸음수 트래커 초기화 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>오류 발생</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initialize}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>트래커가 초기화되지 않았습니다.</Text>
        <TouchableOpacity style={styles.button} onPress={initialize}>
          <Text style={styles.buttonText}>초기화</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 걸음수 표시 */}
      <View style={styles.stepCard}>
        <Text style={styles.stepTitle}>오늘의 걸음수</Text>
        <Text style={styles.stepCount}>{todayData?.steps || 0}</Text>
        <Text style={styles.stepUnit}>보</Text>

        {/* 목표 진행률 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${goalProgress}%`,
                  backgroundColor: goalAchieved ? '#4CAF50' : '#007AFF',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {goalProgress.toFixed(1)}% (목표: {currentGoal.toLocaleString()}보)
          </Text>
        </View>

        {goalAchieved && (
          <Text style={styles.goalAchievedText}>🎉 목표 달성!</Text>
        )}
      </View>

      {/* 상세 정보 */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardTitle}>상세 정보</Text>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>칼로리</Text>
          <Text style={styles.detailValue}>
            {todayData?.calories.toFixed(1) || '0.0'} kcal
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>거리</Text>
          <Text style={styles.detailValue}>
            {todayData?.distance.toFixed(2) || '0.00'} km
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>날짜</Text>
          <Text style={styles.detailValue}>{todayData?.date || '-'}</Text>
        </View>
      </View>

      {/* 센서 정보 */}
      <View style={styles.sensorCard}>
        <Text style={styles.cardTitle}>센서 정보</Text>
        <Text style={styles.sensorInfo}>🔍 가속도계 기반 걸음 감지</Text>
        <Text style={styles.sensorInfo}>📱 React Native Sensors 사용</Text>
        <Text style={styles.sensorInfo}>📊 AsyncStorage 데이터 저장</Text>
      </View>

      {/* 제어 버튼 */}
      <View style={styles.buttonContainer}>
        {!isTracking ? (
          <TouchableOpacity style={styles.startButton} onPress={startTracking}>
            <Text style={styles.startButtonText}>▶ 추적 시작</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
            <Text style={styles.stopButtonText}>⏸ 추적 중지</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.button} onPress={refreshData}>
          <Text style={styles.buttonText}>🔄 새로고침</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSetGoal}>
          <Text style={styles.buttonText}>🎯 목표 설정</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerButton} onPress={handleResetData}>
          <Text style={styles.dangerButtonText}>🗑 데이터 리셋</Text>
        </TouchableOpacity>
      </View>

      {/* 상태 표시 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          상태: {isTracking ? '추적 중' : '중지됨'}
        </Text>
        <Text style={styles.statusText}>
          초기화: {isInitialized ? '완료' : '미완료'}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center' as const,
  },
  errorContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  stepCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center' as const,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stepTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  stepCount: {
    fontSize: 48,
    fontWeight: 'bold' as const,
    color: '#007AFF',
    marginBottom: 4,
  },
  stepUnit: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  progressContainer: {
    width: '100%' as const,
    alignItems: 'center' as const,
  },
  progressBar: {
    width: '100%' as const,
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden' as const,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%' as const,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  goalAchievedText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold' as const,
    marginTop: 8,
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: '#333',
  },
  sensorCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sensorInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  stopButton: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  statusContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
};
