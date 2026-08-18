// 웹용 FcmService 더미 구현
class FcmService {
  constructor() {
    console.warn('FcmService: Web environment, using dummy implementation');
  }

  async initialize() {
    console.warn('FcmService: Web environment, dummy initialization');
    return Promise.resolve();
  }

  async requestPermission() {
    console.warn('FcmService: Web environment, permission always granted');
    return Promise.resolve(true);
  }

  async getToken() {
    console.warn('FcmService: Web environment, returning dummy FCM token');
    return Promise.resolve(`web_dummy_token_${Date.now()}`);
  }

  async subscribeToTopic(topic) {
    console.warn(
      `FcmService: Web environment, dummy subscribe to topic: ${topic}`,
    );
    return Promise.resolve();
  }

  async unsubscribeFromTopic(topic) {
    console.warn(
      `FcmService: Web environment, dummy unsubscribe from topic: ${topic}`,
    );
    return Promise.resolve();
  }

  onMessage(callback) {
    console.warn('FcmService: Web environment, dummy message listener');

    // 웹에서는 더미 메시지를 주기적으로 전송 (테스트용)
    const interval = setInterval(() => {
      if (callback && Math.random() > 0.95) {
        // 5% 확률로 더미 메시지
        callback({
          notification: {
            title: '웹 테스트 알림',
            body: '이것은 웹 환경에서의 더미 알림입니다.',
          },
          data: {
            type: 'test',
            timestamp: Date.now().toString(),
          },
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }

  onBackgroundMessage(callback) {
    console.warn(
      'FcmService: Web environment, dummy background message listener',
    );
    return () => {}; // 빈 cleanup 함수
  }
}

export default new FcmService();
