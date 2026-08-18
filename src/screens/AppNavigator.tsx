import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './SplashScreen';
import MainAppScreen from './MainAppScreen';
import StepTrackerTestScreen from './StepTrackerTestScreen';
import ReactNativeStepTrackerTestScreen from './ReactNativeStepTrackerTestScreen';
import { NativeStepTrackerTestScreen } from './NativeStepTrackerTestScreen';
import { OnBoarding } from './OnBoarding';

type AppState =
  | 'splash'
  | 'onBoarding'
  | 'main'
  | 'stepTest'
  | 'reactNativeStepTest'
  | 'nativeStepTest';

export const AppNavigator: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('splash');

  const handleSplashFinish = () => {
    setAppState('onBoarding');
  };

  const handleOnBoardingFinish = () => {
    setAppState('main');
  };

  // splash 상태일 때만 온보딩 완료 여부 체크 (주석 풀면 한번만 보임)
  // useEffect(() => {
  //   if (appState === 'onBoarding') {
  //     const checkOnboarding = async () => {
  //       try {
  //         const done = await AsyncStorage.getItem('onboardingComplete');
  //         if (done === 'true') {
  //           setAppState('main');
  //         }
  //       } catch (e) {}
  //     };
  //     checkOnboarding();
  //   }
  // }, [appState]);

  const renderScreen = () => {
    switch (appState) {
      case 'splash':
        return <SplashScreen onFinish={handleSplashFinish} />;
      case 'onBoarding':
        return <OnBoarding onFinish={handleOnBoardingFinish} />;
      case 'main':
        return <MainAppScreen />;
      case 'stepTest':
        return <StepTrackerTestScreen />;
      case 'reactNativeStepTest':
        return <ReactNativeStepTrackerTestScreen />;
      case 'nativeStepTest':
        return <NativeStepTrackerTestScreen />;
      default:
        return <SplashScreen onFinish={handleSplashFinish} />;
    }
  };

  return <SafeAreaProvider>{renderScreen()}</SafeAreaProvider>;
};
