// 웹에서 사용할 수 없는 React Native 라이브러리들의 더미 구현
export default {};

// Firebase Messaging 더미
export const getToken = () => Promise.resolve('web_dummy_token');
export const requestPermission = () => Promise.resolve(true);
export const onMessage = () => () => {};

// React Native Sensors 더미
export const accelerometer = {
  pipe: () => ({
    subscribe: () => ({ unsubscribe: () => {} }),
  }),
};

console.warn('Using web dummy implementations for React Native libraries');
