import { PermissionsAndroid, Platform, Alert } from 'react-native';

export const requestHighSamplingRatePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true; // iOS에서는 필요 없음
  }

  try {
    // Android 13 (API 33) 이상에서만 런타임 권한 요청
    if (Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        'android.permission.HIGH_SAMPLING_RATE_SENSORS' as any,
        {
          title: '센서 고속 샘플링 권한',
          message:
            '더 정확한 걸음수 측정을 위해 센서 고속 샘플링 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('HIGH_SAMPLING_RATE_SENSORS 권한 허용됨');
        return true;
      } else {
        console.log('HIGH_SAMPLING_RATE_SENSORS 권한 거부됨');
        return false;
      }
    } else {
      // Android 12 이하에서는 매니페스트 권한만으로 충분
      return true;
    }
  } catch (error) {
    console.warn('HIGH_SAMPLING_RATE_SENSORS 권한 요청 실패:', error);
    return false;
  }
};

export const requestActivityRecognitionPermission =
  async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: '활동 인식 권한',
          message: '걸음수 측정을 위해 활동 인식 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.warn('ACTIVITY_RECOGNITION 권한 요청 실패:', error);
      return false;
    }
  };
