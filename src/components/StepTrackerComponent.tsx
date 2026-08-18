import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useStepTracker } from '../hooks/useStepTracker';
import { PermissionManager } from '../utils/permissionManager';
import stepTrackerService from '../services/stepTrackerService';
import type { DailyStepData } from '../types/stepTracker';

const StepTrackerComponent: React.FC = () => {
  const {
    isInitialized,
    isTracking,
    isLoading,
    error,
    todayData,
    initResult,
    goalProgress,
    goalAchieved,
    remainingSteps,
    startTracking,
    stopTracking,
    refreshData,
    resetTodayData,
    getWeeklyData,
    getMonthlyData,
  } = useStepTracker({
    autoStart: true,
    dailyGoal: 10000,
    updateInterval: 5000,
  });

  const [weeklyData, setWeeklyData] = useState<DailyStepData[]>([]);
  const [showWeeklyData, setShowWeeklyData] = useState(false);
  const [sensorStatus, setSensorStatus] = useState<any>(null);

  // 센서 상태 확인
  const checkSensorStatus = async () => {
    try {
      const status = await stepTrackerService.getSensorStatus();
      setSensorStatus(status);

      const statusText = `
센서 매니저: ${status.sensorManagerAvailable ? '사용 가능' : '사용 불가'}
전체 센서 수: ${status.totalSensors}
걸음수 센서: ${status.stepCounterSensors}개
가속도계 센서: ${status.accelerometerSensors}개
기본 걸음수 센서: ${status.hasDefaultStepCounter ? '있음' : '없음'}
기본 가속도계: ${status.hasDefaultAccelerometer ? '있음' : '없음'}
추적 상태: ${status.isTracking ? '추적 중' : '중지됨'}
현재 걸음수: ${status.currentStepCount}

${
  status.stepCounterInfo
    ? `
걸음수 센서 정보:
- 이름: ${status.stepCounterInfo.name}
- 제조사: ${status.stepCounterInfo.vendor}
- 타입: ${status.stepCounterInfo.type}
- 최대 범위: ${status.stepCounterInfo.maxRange}
- 해상도: ${status.stepCounterInfo.resolution}
- 전력: ${status.stepCounterInfo.power}
`
    : ''
}

${
  status.accelerometerInfo
    ? `
가속도계 정보:
- 이름: ${status.accelerometerInfo.name}
- 제조사: ${status.accelerometerInfo.vendor}
- 타입: ${status.accelerometerInfo.type}
- 최대 범위: ${status.accelerometerInfo.maxRange}
- 해상도: ${status.accelerometerInfo.resolution}
- 전력: ${status.accelerometerInfo.power}
`
    : ''
}
      `;

      Alert.alert('센서 상태', statusText, [{ text: '확인' }]);
    } catch (error) {
      Alert.alert('오류', `센서 상태 확인 실패: ${error}`);
    }
  };

  // SQLite 데이터베이스 확인
  const checkDatabaseData = async () => {
    try {
      const allData = await stepTrackerService.getAllDatabaseData();

      let dataText = '=== SQLite 데이터베이스 내용 ===\n';
      dataText += `총 ${allData.length}개 데이터\n\n`;

      if (allData.length === 0) {
        dataText += '저장된 데이터가 없습니다.';
      } else {
        allData.forEach((data, index) => {
          dataText += `${index + 1}. ${data.date}\n`;
          dataText += `   걸음수: ${data.steps}걸음\n`;
          dataText += `   칼로리: ${data.calories.toFixed(1)}kcal\n`;
          dataText += `   거리: ${data.distance.toFixed(3)}km\n`;
          dataText += `   센서값: ${data.lastSensorValue}\n\n`;
        });
      }

      Alert.alert('SQLite 데이터베이스', dataText, [{ text: '확인' }]);
    } catch (error) {
      Alert.alert('오류', `데이터베이스 확인 실패: ${error}`);
    }
  };

  // 권한 요청
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const hasPermission =
          await PermissionManager.checkActivityRecognitionPermission();
        if (!hasPermission) {
          const granted =
            await PermissionManager.requestActivityRecognitionPermission();
          if (!granted) {
            PermissionManager.showPermissionDeniedAlert();
          }
        }
      } catch (error) {
        console.error('Permission request failed:', error);
      }
    };

    requestPermissions();
  }, []);

  const handleLoadWeeklyData = async () => {
    try {
      const data = await getWeeklyData();
      setWeeklyData(data);
      setShowWeeklyData(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load weekly data');
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset Data',
      "Are you sure you want to reset today's step data?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: resetTodayData,
        },
      ],
    );
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatDistance = (distance: number): string => {
    return `${distance.toFixed(2)} km`;
  };

  const formatCalories = (calories: number): string => {
    return `${calories.toFixed(0)} kcal`;
  };

  if (isLoading && !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing Step Tracker...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Step Tracker</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString()}</Text>
      </View>

      {/* Sensor Status */}
      {initResult && (
        <View style={styles.sensorStatus}>
          <Text style={styles.sensorTitle}>Sensor Status</Text>
          <Text style={styles.sensorInfo}>
            Step Counter:{' '}
            {initResult.hasStepCounter ? '✅ Available' : '❌ Not Available'}
          </Text>
          <Text style={styles.sensorInfo}>
            Accelerometer:{' '}
            {initResult.hasAccelerometer ? '✅ Available' : '❌ Not Available'}
          </Text>
        </View>
      )}

      {/* Main Stats */}
      <View style={styles.mainStats}>
        <View style={styles.stepCircle}>
          <Text style={styles.stepCount}>
            {todayData ? formatNumber(todayData.steps) : '0'}
          </Text>
          <Text style={styles.stepLabel}>Steps</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(goalProgress * 100, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.goalText}>
            Goal: 10,000 steps {goalAchieved ? '🎉' : ''}
          </Text>
          {!goalAchieved && (
            <Text style={styles.remainingText}>
              {formatNumber(remainingSteps)} steps remaining
            </Text>
          )}
        </View>
      </View>

      {/* Additional Stats */}
      {todayData && (
        <View style={styles.additionalStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatDistance(todayData.distance)}
            </Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCalories(todayData.calories)}
            </Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            isTracking ? styles.stopButton : styles.startButton,
          ]}
          onPress={isTracking ? stopTracking : startTracking}
        >
          <Text style={styles.controlButtonText}>
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
          <Text style={styles.refreshButtonText}>Refresh Data</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sensorButton}
          onPress={checkSensorStatus}
        >
          <Text style={styles.sensorButtonText}>센서 상태 확인</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.databaseButton}
          onPress={checkDatabaseData}
        >
          <Text style={styles.databaseButtonText}>SQLite 데이터 확인</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly Data */}
      <View style={styles.weeklySection}>
        <TouchableOpacity
          style={styles.weeklyButton}
          onPress={handleLoadWeeklyData}
        >
          <Text style={styles.weeklyButtonText}>
            {showWeeklyData ? 'Hide' : 'Show'} Weekly Data
          </Text>
        </TouchableOpacity>

        {showWeeklyData && (
          <View style={styles.weeklyData}>
            {weeklyData.map((day, index) => (
              <View key={day.date} style={styles.weeklyItem}>
                <Text style={styles.weeklyDate}>{day.date}</Text>
                <Text style={styles.weeklySteps}>
                  {formatNumber(day.steps)} steps
                </Text>
                <Text style={styles.weeklyDistance}>
                  {formatDistance(day.distance)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton} onPress={handleResetData}>
        <Text style={styles.resetButtonText}>Reset Today's Data</Text>
      </TouchableOpacity>

      {/* Debug Info */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <Text style={styles.debugText}>
            Initialized: {isInitialized.toString()}
          </Text>
          <Text style={styles.debugText}>
            Tracking: {isTracking.toString()}
          </Text>
          <Text style={styles.debugText}>Loading: {isLoading.toString()}</Text>
          {todayData && (
            <Text style={styles.debugText}>
              Last Sensor Value: {todayData.lastSensorValue}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
    marginBottom: 20,
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
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  sensorStatus: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sensorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sensorInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mainStats: {
    alignItems: 'center',
    padding: 20,
  },
  stepCircle: {
    backgroundColor: '#fff',
    borderRadius: 100,
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  stepCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  stepLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  progressBar: {
    width: 120,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  goalText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  remainingText: {
    fontSize: 12,
    color: '#ff6b35',
    marginTop: 4,
    textAlign: 'center',
  },
  additionalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  controlButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButton: {
    backgroundColor: '#28a745',
  },
  stopButton: {
    backgroundColor: '#dc3545',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  weeklySection: {
    margin: 16,
  },
  weeklyButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  weeklyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  weeklyData: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weeklyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weeklyDate: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  weeklySteps: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
    textAlign: 'center',
  },
  weeklyDistance: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    textAlign: 'right',
  },
  resetButton: {
    backgroundColor: '#ff6b35',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  debugText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  sensorButton: {
    backgroundColor: '#FF5722',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 10,
    alignItems: 'center',
  },
  sensorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  databaseButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 10,
    alignItems: 'center',
  },
  databaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StepTrackerComponent;
