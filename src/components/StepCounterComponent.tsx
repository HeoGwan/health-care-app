import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useStepCounter } from '../hooks/useStepCounter';

interface StepCounterComponentProps {
  userWeight?: number; // 사용자 체중 (칼로리 계산용)
}

export const StepCounterComponent: React.FC<StepCounterComponentProps> = ({
  userWeight = 70,
}) => {
  const {
    stepData,
    isTracking,
    error,
    startTracking,
    stopTracking,
    resetSteps,
  } = useStepCounter(userWeight);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>걸음 수 추적</Text>
        <View
          style={[
            styles.statusIndicator,
            isTracking ? styles.statusActive : styles.statusInactive,
          ]}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.dataContainer}>
        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>
            {stepData.steps.toLocaleString()}
          </Text>
          <Text style={styles.dataLabel}>걸음</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>{stepData.distance.toFixed(1)}</Text>
          <Text style={styles.dataLabel}>km</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.dataItem}>
          <Text style={styles.dataValue}>{stepData.calories}</Text>
          <Text style={styles.dataLabel}>kcal</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {!isTracking ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={startTracking}
          >
            <Text style={styles.buttonText}>추적 시작</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stopTracking}
          >
            <Text style={styles.buttonText}>추적 중지</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetSteps}
        >
          <Text style={styles.buttonText}>초기화</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.timestamp}>
        마지막 업데이트: {stepData.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#9E9E9E',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
  },
  dataContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  dataItem: {
    alignItems: 'center',
    flex: 1,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#007AFF',
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF5722',
  },
  resetButton: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
