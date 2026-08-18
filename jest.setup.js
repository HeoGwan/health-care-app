// Jest setup for React Native testing
jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock react-native modules
jest.mock('react-native-webview', () => {
  return {
    WebView: 'WebView',
  };
});

// Kakao login mock (if installed)
try {
  jest.mock('@react-native-seoul/kakao-login', () => ({
    login: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
  }));
} catch (e) {
  // Module not installed, skip mock
}

jest.mock('react-native-sensors', () => ({
  accelerometer: {
    subscribe: jest.fn(),
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: jest.fn(),
  getApp: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: jest.fn(),
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
  getMessaging: jest.fn(() => ({
    deleteToken: jest.fn(() => Promise.resolve()),
  })),
  requestPermission: jest.fn(() => Promise.resolve(1)),
}));

// Mock Samsung Health native module
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.SamsungHealthModule = {
    isHealthDataAvailable: jest.fn(() => Promise.resolve(true)),
    requestHealthPermissions: jest.fn(() => Promise.resolve(true)),
    getStepCount: jest.fn(() => Promise.resolve(1000)),
    getHeartRate: jest.fn(() => Promise.resolve(70)),
    getSleepData: jest.fn(() =>
      Promise.resolve({ duration: 480, quality: 'good' }),
    ),
    sendWebViewMessage: jest.fn(),
  };

  RN.NativeEventEmitter = jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
  }));

  return RN;
});

// React Native 0.81 no longer exposes NativeAnimatedHelper at the legacy path.
// The current React Native Jest preset handles Animated without this mock.
