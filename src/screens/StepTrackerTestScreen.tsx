import React from 'react';
import { View, StyleSheet } from 'react-native';
import StepTrackerComponent from '../components/StepTrackerComponent';

const StepTrackerTestScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StepTrackerComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default StepTrackerTestScreen;
