import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { ReactNativeStepTrackerComponent } from '../components/ReactNativeStepTrackerComponent';

const ReactNativeStepTrackerTestScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>React Native 센서 기반</Text>
        <Text style={styles.subtitle}>걸음수 트래커 테스트</Text>
      </View>

      <ReactNativeStepTrackerComponent dailyGoal={10000} autoStart={true} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
});

export default ReactNativeStepTrackerTestScreen;
