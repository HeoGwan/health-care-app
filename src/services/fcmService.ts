import { getApp } from '@react-native-firebase/app';
import messaging, {
  getMessaging,
  AuthorizationStatus,
  requestPermission,
} from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';

export interface FcmTokenData {
  token: string;
  timestamp: number;
}

export interface FcmMessage {
  messageId: string;
  data?: Record<string, any>;
  notification?: {
    title?: string;
    body?: string;
    android?: {
      channelId?: string;
      clickAction?: string;
    };
  };
}

class FcmService {
  private fcmToken: string | null = null;
  private isInitialized = false;
  private messagingInstance: ReturnType<typeof getMessaging>;

  constructor() {
    // Firebase App 인스턴스를 가져와서 messaging 인스턴스 생성
    const app = getApp();
    this.messagingInstance = getMessaging(app);
  }

  /**
   * FCM 초기화 및 권한 요청
   */
  async initialize(): Promise<boolean> {
    try {
      // Android 푸시 알림 권한 요청 (Android 13+)
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: '푸시 알림 권한',
            message: '건강 관련 알림을 받기 위해 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          },
        );

        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('푸시 알림 권한이 거부되었습니다');
          return false;
        }
      }

      // FCM 권한 요청
      const authStatus = await requestPermission(this.messagingInstance);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('FCM 권한이 거부되었습니다');
        return false;
      }

      // 백그라운드 메시지 핸들러 설정
      this.setupBackgroundMessageHandler();

      // 포그라운드 메시지 핸들러 설정
      this.setupForegroundMessageHandler();

      // 토큰 갱신 리스너 설정
      this.setupTokenRefreshListener();

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('FCM 초기화 실패:', error);
      return false;
    }
  }

  /**
   * FCM 토큰 가져오기
   */
  async getFcmToken(): Promise<string | null> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      let token: string | null = null;

      // iOS에서는 네이티브 모듈 사용
      if (Platform.OS === 'ios' && NativeModules.FirebaseMessagingModule) {
        try {
          token = await NativeModules.FirebaseMessagingModule.getFCMToken();
        } catch (error) {
          console.warn(
            'iOS 네이티브 FCM 토큰 가져오기 실패, 기본 방식 시도:',
            error,
          );
        }
      }

      // Android 또는 iOS 네이티브 모듈 실패 시 기본 방식 사용
      if (!token) {
        token = await this.messagingInstance.getToken();
      }

      this.fcmToken = token;
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('FCM 토큰 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 현재 저장된 FCM 토큰 반환
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * FCM 토큰 데이터 객체 반환
   */
  getFcmTokenData(): FcmTokenData | null {
    if (!this.fcmToken) {
      return null;
    }

    return {
      token: this.fcmToken,
      timestamp: Date.now(),
    };
  }

  /**
   * 백그라운드 메시지 핸들러 설정
   */
  private setupBackgroundMessageHandler(): void {
    this.messagingInstance.setBackgroundMessageHandler(async remoteMessage => {
      console.log('백그라운드 FCM 메시지 수신:', remoteMessage);

      // 백그라운드에서 받은 메시지 처리
      this.handleFcmMessage(remoteMessage);
    });
  }

  /**
   * 포그라운드 메시지 핸들러 설정
   */
  private setupForegroundMessageHandler(): () => void {
    const unsubscribe = this.messagingInstance.onMessage(
      async remoteMessage => {
        console.log('포그라운드 FCM 메시지 수신:', remoteMessage);

        // 포그라운드에서 받은 메시지 처리
        this.handleFcmMessage(remoteMessage);
      },
    );

    // 컴포넌트 언마운트 시 구독 해제
    return unsubscribe;
  }

  /**
   * 토큰 갱신 리스너 설정
   */
  private setupTokenRefreshListener(): () => void {
    const unsubscribe = this.messagingInstance.onTokenRefresh(token => {
      console.log('FCM 토큰 갱신:', token);
      this.fcmToken = token;

      // 갱신된 토큰을 서버에 업데이트
      this.updateTokenOnServer(token);
    });

    return unsubscribe;
  }

  /**
   * FCM 메시지 처리
   */
  private handleFcmMessage(remoteMessage: any): void {
    const message: FcmMessage = {
      messageId: remoteMessage.messageId || '',
      data: remoteMessage.data,
      notification: remoteMessage.notification,
    };

    // 메시지 타입별 처리
    if (message.data?.type === 'health_reminder') {
      this.handleHealthReminderMessage(message);
    } else if (message.data?.type === 'step_achievement') {
      this.handleStepAchievementMessage(message);
    } else {
      this.handleGeneralMessage(message);
    }
  }

  /**
   * 건강 알림 메시지 처리
   */
  private handleHealthReminderMessage(message: FcmMessage): void {
    console.log('건강 알림 메시지:', message);
    // 건강 알림 처리 로직
  }

  /**
   * 걸음 수 달성 메시지 처리
   */
  private handleStepAchievementMessage(message: FcmMessage): void {
    console.log('걸음 수 달성 메시지:', message);
    // 걸음 수 달성 처리 로직
  }

  /**
   * 일반 메시지 처리
   */
  private handleGeneralMessage(message: FcmMessage): void {
    console.log('일반 FCM 메시지:', message);
    // 일반 메시지 처리 로직
  }

  /**
   * 서버에 토큰 업데이트
   */
  private async updateTokenOnServer(token: string): Promise<void> {
    try {
      // 서버 API 호출하여 토큰 업데이트
      console.log('서버에 FCM 토큰 업데이트:', token);

      // 실제 구현에서는 서버 API 호출
      // await fetch('/api/fcm/token', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ token })
      // });
    } catch (error) {
      console.error('서버 토큰 업데이트 실패:', error);
    }
  }

  /**
   * 앱이 백그라운드/종료 상태에서 알림 탭으로 열렸을 때의 초기 메시지 가져오기
   */
  async getInitialNotification(): Promise<FcmMessage | null> {
    try {
      const remoteMessage =
        await this.messagingInstance.getInitialNotification();

      if (remoteMessage) {
        console.log('초기 알림 메시지:', remoteMessage);
        return {
          messageId: remoteMessage.messageId || '',
          data: remoteMessage.data,
          notification: remoteMessage.notification,
        };
      }

      return null;
    } catch (error) {
      console.error('초기 알림 가져오기 실패:', error);
      return null;
    }
  }

  /**
   * 특정 토픽 구독
   */
  async subscribeToTopic(topic: string): Promise<boolean> {
    try {
      await this.messagingInstance.subscribeToTopic(topic);
      console.log(`토픽 구독 성공: ${topic}`);
      return true;
    } catch (error) {
      console.error(`토픽 구독 실패: ${topic}`, error);
      return false;
    }
  }

  /**
   * 특정 토픽 구독 해제
   */
  async unsubscribeFromTopic(topic: string): Promise<boolean> {
    try {
      await this.messagingInstance.unsubscribeFromTopic(topic);
      console.log(`토픽 구독 해제 성공: ${topic}`);
      return true;
    } catch (error) {
      console.error(`토픽 구독 해제 실패: ${topic}`, error);
      return false;
    }
  }

  /**
   * FCM 토큰 삭제 (로그아웃 시 사용)
   */
  async deleteToken(): Promise<boolean> {
    try {
      await this.messagingInstance.deleteToken();
      this.fcmToken = null;
      console.log('FCM 토큰 삭제 성공');
      return true;
    } catch (error) {
      console.error('FCM 토큰 삭제 실패:', error);
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const fcmService = new FcmService();
export default fcmService;
