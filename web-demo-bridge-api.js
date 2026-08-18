/**
 * Healthcare WebView Bridge API
 * 웹앱에서 React Native 네이티브 기능에 접근하기 위한 JavaScript API
 */

/**
 * Healthcare WebView Bridge API 클래스
 */
class HealthcareWebViewAPI {
  constructor() {
    this.isReady = false;
    this.readyCallbacks = [];

    // API 준비 상태 확인
    this.checkReady();
  }

  /**
   * API 준비 상태 확인
   */
  checkReady() {
    const checkInterval = setInterval(() => {
      if (window.getSamsungHealth && window.getFcmToken) {
        this.isReady = true;
        clearInterval(checkInterval);
        this.readyCallbacks.forEach(callback => callback());
        this.readyCallbacks = [];
      }
    }, 100);

    // 5초 후 타임아웃
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!this.isReady) {
        console.warn('Healthcare WebView API 초기화 타임아웃');
      }
    }, 5000);
  }

  /**
   * API 준비 완료 시 콜백 실행
   */
  onReady(callback) {
    if (this.isReady) {
      callback();
    } else {
      this.readyCallbacks.push(callback);
    }
  }

  /**
   * Samsung Health 데이터 요청
   */
  getSamsungHealth() {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('API가 준비되지 않았습니다'));
        return;
      }

      // 응답 콜백 설정
      window.onSamsungHealthData = data => {
        resolve(data);
        window.onSamsungHealthData = undefined; // 일회성 콜백
      };

      // 5초 타임아웃
      setTimeout(() => {
        if (window.onSamsungHealthData) {
          window.onSamsungHealthData = undefined;
          reject(new Error('Samsung Health 데이터 요청 타임아웃'));
        }
      }, 5000);

      // 네이티브 함수 호출
      window.getSamsungHealth();
    });
  }

  /**
   * FCM 토큰 요청
   */
  getFcmToken() {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('API가 준비되지 않았습니다'));
        return;
      }

      // 응답 콜백 설정
      window.onFcmToken = data => {
        resolve(data);
        window.onFcmToken = undefined; // 일회성 콜백
      };

      // 5초 타임아웃
      setTimeout(() => {
        if (window.onFcmToken) {
          window.onFcmToken = undefined;
          reject(new Error('FCM 토큰 요청 타임아웃'));
        }
      }, 5000);

      // 네이티브 함수 호출
      window.getFcmToken();
    });
  }

  /**
   * FCM 토픽 구독
   */
  subscribeTopic(topic) {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('API가 준비되지 않았습니다'));
        return;
      }

      if (!topic || typeof topic !== 'string') {
        reject(new Error('유효하지 않은 토픽입니다'));
        return;
      }

      // 응답 콜백 설정
      window.onTopicSubscribed = data => {
        if (data.topic === topic) {
          resolve(data.success);
          window.onTopicSubscribed = undefined; // 일회성 콜백
        }
      };

      // 5초 타임아웃
      setTimeout(() => {
        if (window.onTopicSubscribed) {
          window.onTopicSubscribed = undefined;
          reject(new Error('토픽 구독 요청 타임아웃'));
        }
      }, 5000);

      // 네이티브 함수 호출
      window.subscribeTopic(topic);
    });
  }

  /**
   * FCM 토픽 구독 해제
   */
  unsubscribeTopic(topic) {
    return new Promise((resolve, reject) => {
      if (!this.isReady) {
        reject(new Error('API가 준비되지 않았습니다'));
        return;
      }

      if (!topic || typeof topic !== 'string') {
        reject(new Error('유효하지 않은 토픽입니다'));
        return;
      }

      // 응답 콜백 설정
      window.onTopicUnsubscribed = data => {
        if (data.topic === topic) {
          resolve(data.success);
          window.onTopicUnsubscribed = undefined; // 일회성 콜백
        }
      };

      // 5초 타임아웃
      setTimeout(() => {
        if (window.onTopicUnsubscribed) {
          window.onTopicUnsubscribed = undefined;
          reject(new Error('토픽 구독 해제 요청 타임아웃'));
        }
      }, 5000);

      // 네이티브 함수 호출
      window.unsubscribeTopic(topic);
    });
  }

  /**
   * 편의 메서드: 건강 관련 토픽들 일괄 구독
   */
  async subscribeHealthTopics() {
    const healthTopics = [
      'health_reminders',
      'step_achievements',
      'daily_health_tips',
      'medication_reminders',
    ];

    const results = {};

    for (const topic of healthTopics) {
      try {
        results[topic] = await this.subscribeTopic(topic);
      } catch (error) {
        console.warn(`토픽 구독 실패: ${topic}`, error);
        results[topic] = false;
      }
    }

    return results;
  }

  /**
   * 편의 메서드: 모든 건강 토픽 구독 해제
   */
  async unsubscribeAllHealthTopics() {
    const healthTopics = [
      'health_reminders',
      'step_achievements',
      'daily_health_tips',
      'medication_reminders',
    ];

    const results = {};

    for (const topic of healthTopics) {
      try {
        results[topic] = await this.unsubscribeTopic(topic);
      } catch (error) {
        console.warn(`토픽 구독 해제 실패: ${topic}`, error);
        results[topic] = false;
      }
    }

    return results;
  }
}

// 글로벌 API 인스턴스 생성
const healthcareAPI = new HealthcareWebViewAPI();

// 글로벌 윈도우 객체에 등록
if (typeof window !== 'undefined') {
  window.healthcareAPI = healthcareAPI;
}

// CommonJS 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = healthcareAPI;
}
