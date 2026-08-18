import { NativeModules, Platform } from 'react-native';

const { SamsungHealthModule } = NativeModules;

export interface WalkingData {
  date: string;
  steps: number;
  distance: number;
  calories: number;
}

class SamsungHealthService {
  private isInitialized = false;

  async initialize(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        console.warn('Health API is only available on Android');
        return false;
      }

      if (!SamsungHealthModule) {
        console.warn('Health module is not available');
        return false;
      }

      if (this.isInitialized) {
        console.log('✅ Already initialized');
        return true;
      }

      console.log('🏥 초기화 중...');
      await SamsungHealthModule.initialize();

      // 권한 확인
      let hasPermissions = await this.checkPermissions();
      console.log('🔍 권한 상태:', hasPermissions);

      if (!hasPermissions) {
        console.log('🔐 권한 요청 중... (팝업이 나타납니다)');
        await this.requestPermissions();

        // 권한 요청 후 3초 대기 (사용자가 권한을 허용할 시간)
        console.log('⏳ 권한 허용을 기다리는 중... (3초)');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 권한 재확인
        hasPermissions = await this.checkPermissions();
        console.log('🔍 권한 재확인:', hasPermissions);

        if (!hasPermissions) {
          console.warn('⚠️ 권한이 허용되지 않았습니다. 다시 시도해주세요.');
          return false;
        }
      }

      this.isInitialized = true;
      console.log('✅ 초기화 완료 (권한 허용됨)');

      // 데이터 소스 확인
      const dataSources = await this.checkDataSources();
      if (dataSources) {
        console.log('📊 Health Connect 데이터 소스:');
        console.log(`  - 총 레코드: ${dataSources.totalRecords}개`);
        console.log(
          `  - 데이터 제공 앱: ${dataSources.sourceApps.join(', ') || '없음'}`,
        );
        console.log(
          `  - 삼성 헬스 연동: ${
            dataSources.hasSamsungHealth ? '✅ 예' : '❌ 아니오'
          }`,
        );

        if (!dataSources.hasSamsungHealth && dataSources.totalRecords === 0) {
          console.warn(
            '⚠️ 경고: Health Connect에 삼성 헬스 데이터가 없습니다.',
          );
          console.warn(
            '💡 해결 방법: 삼성 헬스 앱 > 설정 > Health Connect 연동 활성화',
          );
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize:', error);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android' || !SamsungHealthModule) {
        return false;
      }
      return await SamsungHealthModule.checkPermissions();
    } catch (error) {
      console.error('Failed to check permissions:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<void> {
    try {
      if (Platform.OS !== 'android' || !SamsungHealthModule) {
        return;
      }
      await SamsungHealthModule.requestPermissions();
    } catch (error) {
      console.error('Failed to request permissions:', error);
    }
  }

  async checkDataSources(): Promise<{
    totalRecords: number;
    sourceApps: string[];
    hasSamsungHealth: boolean;
  } | null> {
    try {
      if (Platform.OS !== 'android' || !SamsungHealthModule) {
        return null;
      }

      console.log('🔍 Health Connect 데이터 소스 확인 중...');
      const result = await SamsungHealthModule.checkDataSources();
      console.log('📱 결과:', result);
      return result;
    } catch (error) {
      console.error('Failed to check data sources:', error);
      return null;
    }
  }

  async getMonthlyWalkingData(): Promise<WalkingData[]> {
    try {
      if (Platform.OS !== 'android') {
        console.warn('Samsung Health is only available on Android');
        return [];
      }

      if (!SamsungHealthModule) {
        console.warn('Samsung Health module is not available');
        return [];
      }

      // 자동으로 초기화
      if (!this.isInitialized) {
        console.log('⚠️ 초기화되지 않음 - 자동 초기화 시작...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('초기화 실패');
          return [];
        }
      }

      console.log('📅 한달치 걷기 데이터 조회 시작...');
      console.log('🔍 네이티브 모듈 호출 직전...');
      const result = await SamsungHealthModule.getMonthlyWalkingData();
      console.log('🔍 네이티브 모듈 호출 완료!');
      console.log(`✅ 한달치 데이터 조회 완료: ${result.length}일치 데이터`);
      console.log('📦 받은 데이터:', JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      console.error('❌❌❌ Failed to get monthly walking data:', error);
      console.error('에러 타입:', typeof error);
      console.error('에러 내용:', JSON.stringify(error, null, 2));
      if (error instanceof Error) {
        console.error('에러 메시지:', error.message);
        console.error('에러 스택:', error.stack);
      }
      return [];
    }
  }

  async getTodayWalkingData(): Promise<WalkingData> {
    try {
      if (Platform.OS !== 'android') {
        console.warn('Samsung Health is only available on Android');
        return {
          date: new Date().toISOString().split('T')[0],
          steps: 0,
          distance: 0,
          calories: 0,
        };
      }

      if (!SamsungHealthModule) {
        console.warn('Samsung Health module is not available');
        return {
          date: new Date().toISOString().split('T')[0],
          steps: 0,
          distance: 0,
          calories: 0,
        };
      }

      // 자동으로 초기화
      if (!this.isInitialized) {
        console.log('⚠️ 초기화되지 않음 - 자동 초기화 시작...');
        const initialized = await this.initialize();
        if (!initialized) {
          console.error('초기화 실패');
          return {
            date: new Date().toISOString().split('T')[0],
            steps: 0,
            distance: 0,
            calories: 0,
          };
        }
      }

      const result = await SamsungHealthModule.getTodayWalkingData();
      return result;
    } catch (error) {
      console.error('Failed to get today walking data:', error);
      return {
        date: new Date().toISOString().split('T')[0],
        steps: 0,
        distance: 0,
        calories: 0,
      };
    }
  }

  /**
   * Samsung Health -> Health Connect 동기화 가이드 가져오기
   */
  async getSyncGuide(): Promise<{
    title: string;
    message: string;
    steps: Array<{
      step: number;
      title: string;
      description: string;
      icon: string;
    }>;
    troubleshooting: string[];
  } | null> {
    try {
      if (Platform.OS !== 'android' || !SamsungHealthModule) {
        return null;
      }
      return await SamsungHealthModule.showSyncGuide();
    } catch (error) {
      console.error('Failed to get sync guide:', error);
      return null;
    }
  }

  /**
   * Health Connect 설정 화면 열기
   */
  async openHealthConnectSettings(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android' || !SamsungHealthModule) {
        return false;
      }
      return await SamsungHealthModule.openHealthConnectSettings();
    } catch (error) {
      console.error('Failed to open Health Connect settings:', error);
      return false;
    }
  }

  /**
   * Samsung Health 앱 열기
   */
  async openSamsungHealth(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android' || !SamsungHealthModule) {
        return false;
      }
      return await SamsungHealthModule.openSamsungHealthSettings();
    } catch (error) {
      console.error('Failed to open Samsung Health:', error);
      return false;
    }
  }

  /**
   * 데이터가 없을 때 동기화 가이드 표시 여부 확인
   */
  async shouldShowSyncGuide(): Promise<boolean> {
    try {
      const dataSources = await this.checkDataSources();
      if (!dataSources) {
        return false;
      }

      // Health Connect에 데이터가 없고, 삼성 헬스가 연동되지 않았을 때
      return dataSources.totalRecords === 0 && !dataSources.hasSamsungHealth;
    } catch (error) {
      console.error('Failed to check if should show sync guide:', error);
      return false;
    }
  }
}

export const samsungHealthService = new SamsungHealthService();
export default samsungHealthService;
