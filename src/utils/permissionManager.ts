import { PermissionsAndroid, Platform, Alert } from 'react-native';

export class PermissionManager {
  /**
   * ACTIVITY_RECOGNITION 권한 요청
   */
  static async requestActivityRecognitionPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS는 별도 권한이 필요 없음
    }

    if (Platform.Version < 29) {
      return true; // Android 10 미만은 권한이 필요 없음
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: '걸음수 추적 권한',
          message: '걸음수를 추적하기 위해 활동 인식 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        },
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }

  /**
   * 권한 상태 확인
   */
  static async checkActivityRecognitionPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    if (Platform.Version < 29) {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      );
      return granted;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * 권한이 거부되었을 때 설정으로 이동 안내
   */
  static showPermissionDeniedAlert(): void {
    Alert.alert(
      '권한이 필요합니다',
      '걸음수 추적을 위해 활동 인식 권한이 필요합니다. 설정에서 권한을 허용해주세요.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '설정으로 이동',
          onPress: () => {
            // 설정 앱으로 이동하는 로직을 추가할 수 있습니다
            console.log('Settings navigation would go here');
          },
        },
      ],
    );
  }
}
