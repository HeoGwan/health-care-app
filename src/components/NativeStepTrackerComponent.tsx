import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNativeStepTracker } from '../hooks/useNativeStepTracker';

export const NativeStepTrackerComponent: React.FC = () => {
  const {
    isTracking,
    stepData,
    isLoading,
    error,
    isModuleAvailable,
    startTracking,
    stopTracking,
    resetData,
    refreshData,
    goalProgress,
    todaySteps,
    todayCalories,
    todayDistance,
  } = useNativeStepTracker();

  const handleStartStop = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  const handleReset = () => {
    Alert.alert('데이터 리셋', '오늘의 걸음수 데이터를 초기화하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: resetData },
    ]);
  };

  if (!isModuleAvailable) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          네이티브 StepTracker 모듈을 사용할 수 없습니다.
        </Text>
        <Text style={styles.subText}>
          React Native 네이티브 모듈이 제대로 빌드되지 않았을 수 있습니다.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>네이티브 걸음수 측정</Text>
        <Text style={styles.subtitle}>Android 네이티브 센서 사용</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>오류: {error}</Text>
        </View>
      )}

      {/* 메인 통계 */}
      <View style={styles.statsContainer}>
        <View style={styles.mainStat}>
          <Text style={styles.stepCount}>{todaySteps.toLocaleString()}</Text>
          <Text style={styles.stepLabel}>걸음</Text>
        </View>

        {/* 진행률 바 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressFill, { width: `${goalProgress}%` }]}
            />
          </View>
          <Text style={styles.progressText}>
            {goalProgress.toFixed(1)}% (목표: 10,000보)
          </Text>
        </View>

        {/* 상세 통계 */}
        <View style={styles.detailStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{todayCalories.toFixed(1)}</Text>
            <Text style={styles.statLabel}>칼로리</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(todayDistance / 1000).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>거리 (km)</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stepData.date}</Text>
            <Text style={styles.statLabel}>날짜</Text>
          </View>
        </View>
      </View>

      {/* 센서 상태 */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>센서 상태</Text>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>추적 상태:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: isTracking ? '#4CAF50' : '#FF5722' },
            ]}
          >
            {isTracking ? '추적 중' : '중지됨'}
          </Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>네이티브 모듈:</Text>
          <Text
            style={[
              styles.statusValue,
              { color: isModuleAvailable ? '#4CAF50' : '#FF5722' },
            ]}
          >
            {isModuleAvailable ? '사용 가능' : '사용 불가'}
          </Text>
        </View>
      </View>

      {/* 컨트롤 버튼 */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            isTracking ? styles.stopButton : styles.startButton,
          ]}
          onPress={handleStartStop}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {isTracking ? '추적 중지' : '추적 시작'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={refreshData}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>새로고침</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={handleReset}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>데이터 리셋</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 15,
    margin: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#C62828',
    fontSize: 16,
    fontWeight: '500',
  },
  subText: {
    color: '#666',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mainStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  stepLabel: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  controlsContainer: {
    padding: 15,
    gap: 10,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF5722',
  },
  refreshButton: {
    backgroundColor: '#FF9800',
  },
  resetButton: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});
