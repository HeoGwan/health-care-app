import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  NativeEventEmitter,
  NativeModules,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomWebView } from '../components/CustomWebView';
import { useWebView } from '../hooks/useWebView';
import { WebViewConfig, WebViewError } from '../types';
import { DEFAULT_CONFIG, COLORS } from '../constants';
import { formatUrl } from '../utils/webViewUtils';
import fcmService from '../services/fcmService';
import { PermissionManager } from '../utils/permissionManager';

interface WebViewScreenProps {
  initialConfig?: Partial<WebViewConfig>;
}

export const WebViewScreen: React.FC<WebViewScreenProps> = ({
  initialConfig = {},
}) => {
  const config: WebViewConfig = {
    url: formatUrl(initialConfig.url || DEFAULT_CONFIG.DEFAULT_URL),
    title: initialConfig.title,
    showHeader: initialConfig.showHeader ?? DEFAULT_CONFIG.SHOW_HEADER,
    javaScriptEnabled:
      initialConfig.javaScriptEnabled ?? DEFAULT_CONFIG.JAVASCRIPT_ENABLED,
    domStorageEnabled:
      initialConfig.domStorageEnabled ?? DEFAULT_CONFIG.DOM_STORAGE_ENABLED,
    allowsBackForwardNavigationGestures:
      initialConfig.allowsBackForwardNavigationGestures ??
      DEFAULT_CONFIG.ALLOWS_BACK_FORWARD_GESTURES,
  };

  const {
    webViewRef,
    navigationState,
    handleNavigationStateChange,
    goBack,
    goForward,
    reload,
  } = useWebView(config.url);

  const [currentConfig, _setCurrentConfig] = useState<WebViewConfig>(config);
  const [isStepTrackingStarted, setIsStepTrackingStarted] = useState(false);
  const [hasInitializedAPIs, setHasInitializedAPIs] = useState(false);
  const [lastApiCallTime, setLastApiCallTime] = useState(0);

  // WebView에서 JWT 토큰 추출 요청
  const requestJwtTokenFromWebView = () => {
    if (!webViewRef.current) {
      console.error('❌ webViewRef가 없습니다.');
      return;
    }
    console.log('📤 localStorage에서 JWT 토큰 추출 요청 중...');
    webViewRef.current.injectJavaScript(`
      (function() {
        try {
          console.log('🔍 iOS localStorage 접근 시도...');
          
          // localStorage 사용 가능 여부 확인
          if (typeof(Storage) === "undefined") {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'JWT_TOKEN_RESULT',
              data: { token: null, error: 'localStorage not supported' }
            }));
            return;
          }
          
          // localStorage 내용 전체 확인
          console.log('📋 localStorage 키 목록:', Object.keys(localStorage));
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log('🔑 localStorage[' + key + '] = ' + localStorage.getItem(key)?.substring(0, 50) + '...');
          }
          
          const tokenKeys = [
            'routine-care-access-token',
            'accessToken', 
            'token',
            'jwt',
            'auth_token',
            'authToken',
            'access_token',
            'ROUTINE_CARE_ACCESS_TOKEN'
          ];
          
          let foundToken = null;
          let foundKey = null;
          
          for (const key of tokenKeys) {
            const value = localStorage.getItem(key);
            if (value && value.length > 10) {
              foundToken = value;
              foundKey = key;
              console.log('✅ 토큰 발견! 키:', key, '값:', value.substring(0, 30) + '...');
              break;
            }
          }
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'JWT_TOKEN_RESULT',
            data: { 
              token: foundToken, 
              foundKey: foundKey,
              totalKeys: localStorage.length,
              allKeys: Object.keys(localStorage)
            }
          }));
        } catch (error) {
          console.error('❌ localStorage 접근 오류:', error);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'JWT_TOKEN_RESULT',
            data: { token: null, error: error.toString() }
          }));
        }
      })();
    `);
  };

  // JWT 토큰을 받아서 FCM API 호출
  const sendFCMTokenToAPI = async (jwtToken: string) => {
    console.log('🔑 FCM 토큰 API 전송 시작...');
    try {
      if (!jwtToken) {
        console.error('❌ JWT 토큰이 없습니다.');
        return;
      }

      console.log(
        '✅ JWT 토큰 가져오기 성공:',
        jwtToken.substring(0, 20) + '...',
      );

      // FCM 토큰 가져오기
      const fcmToken = await fcmService.getFcmToken();
      if (!fcmToken) {
        console.error('❌ FCM 토큰을 가져올 수 없습니다.');
        return;
      }

      // API로 FCM 토큰 전송
      console.log('📤 API로 FCM 토큰 전송 중...');
      console.log('🔑 JWT Token:', jwtToken.substring(0, 20) + '...');
      console.log('📱 FCM Token:', fcmToken.substring(0, 50) + '...');

      const response = await fetch(
        'https://routine-care-api.insystem.kr/users/fcm-token',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify({
            fcmToken: fcmToken,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ FCM 토큰 API 전송 성공:', result);
      } else {
        const errorText = await response.text();
        console.error(
          `❌ FCM 토큰 API 전송 실패: ${response.status} ${response.statusText}`,
        );
        console.error('응답 내용:', errorText);
      }
    } catch (error) {
      console.error('❌ FCM 토큰 API 전송 중 오류:', error);
    }
  };

  // Samsung Health 걸음 수 데이터 전송 함수 (간단한 걷기 데이터만)
  const sendSamsungHealthDataToAPI = async () => {
    console.log('🚶‍♂️ Samsung Health 걷기 데이터 API 전송 시작...');

    try {
      const samsungHealthService =
        require('../services/samsungHealthService').default;
      const walkingMonthlyData =
        await samsungHealthService.getMonthlyWalkingData();

      if (!walkingMonthlyData || walkingMonthlyData.length === 0) {
        console.warn('⚠️ 걷기 데이터가 없습니다.');
        return;
      }

      // 모든 값을 문자열로 변환하여 stepCount만 남김
      const transformedData = walkingMonthlyData.map(item => ({
        stepCount: String(item.steps),
        distance: String(item.distance),
        calories: String(item.calories),
        date: item.date ? String(item.date) : '',
      }));

      console.log('transformedData', transformedData);

      // JWT 토큰 가져오기
      const jwtToken = await AsyncStorage.getItem('jwtToken');
      if (!jwtToken) {
        console.error('❌ JWT 토큰을 찾을 수 없습니다.');
        return;
      }

      // API로 배열 데이터 전송
      const response = await fetch(
        'https://routine-care-api.insystem.kr/health-steps',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify(transformedData),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 걷기 데이터 API 전송 성공:', result);
      } else {
        const errorText = await response.text();
        console.error(
          `❌ 걷기 데이터 API 전송 실패: ${response.status} ${response.statusText}`,
        );
        console.error('응답 내용:', errorText);
      }
    } catch (error) {
      console.error('❌ 걷기 데이터 API 호출 중 오류:', error);
    }
  };

  // 센서 기반 걷기 데이터 API 전송 함수 (StepTrackerService/SQLite)
  const sendSensorStepDataToAPI = async () => {
    console.log('🚶‍♂️ 센서 기반 걷기 데이터 API 전송 시작...');
    try {
      // StepTrackerService에서 월간 데이터 가져오기 (SQLite 기반)
      const stepTrackerService =
        require('../services/stepTrackerService').default;
      const monthlyData = await stepTrackerService.getMonthlyData();
      console.log(
        'Original monthlyData from Native:',
        JSON.stringify(monthlyData, null, 2),
      ); // <- test

      if (!monthlyData || monthlyData.length === 0) {
        console.warn('⚠️ 유효한 센서 기반 걸음수 데이터가 없습니다.');
        return;
      }

      console.log(
        `📊 전송할 걸음수 데이터: ${monthlyData.length}일간의 데이터`,
      );
      monthlyData.forEach(data => {
        console.log(
          `📅 ${data.date}: ${data.steps}걸음, ${data.distance}m, ${data.calories}kcal`,
        );
      });

      // 모든 값을 문자열로 변환
      const transformedData = monthlyData
        .filter(item => item.date)
        .map(item => ({
          stepCount: String(item.steps),
          distance: String(item.distance),
          calories: String(item.calories),
          date: String(item.date),
        }));

      console.log('transformedData', transformedData);

      // JWT 토큰 가져오기
      const jwtToken = await AsyncStorage.getItem('jwtToken');
      if (!jwtToken) {
        console.error('❌ JWT 토큰을 찾을 수 없습니다.');
        return;
      }

      // API로 배열 데이터 전송
      const response = await fetch(
        'https://routine-care-api.insystem.kr/health-steps',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwtToken}`,
          },
          body: JSON.stringify(transformedData),
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 센서 기반 걷기 데이터 API 전송 성공:', result);
      } else {
        const errorText = await response.text();
        console.error(
          `❌ 센서 기반 걷기 데이터 API 전송 실패: ${response.status} ${response.statusText}`,
        );
        console.error('응답 내용:', errorText);
      }
    } catch (error) {
      console.error('❌ 센서 기반 걷기 데이터 API 호출 중 오류:', error);
    }
  };

  // SQLite 데이터베이스 확인
  const checkDatabaseData = async () => {
    try {
      const stepTrackerService =
        require('../services/stepTrackerService').default;
      const allData = await stepTrackerService.getAllDatabaseData();

      let dataText = '=== SQLite 데이터베이스 내용 ===\n';
      dataText += `총 ${allData.length}개 데이터\n\n`;

      if (allData.length === 0) {
        dataText += '저장된 데이터가 없습니다.';
      } else {
        allData.forEach((data, index) => {
          dataText += `${index + 1}. ${data.date}\n`;
          dataText += `   걸음수: ${data.steps}걸음\n`;
          dataText += `   칼로리: ${data.calories.toFixed(1)}kcal\n`;
          dataText += `   거리: ${data.distance.toFixed(3)}km\n`;
          dataText += `   센서값: ${data.lastSensorValue}\n\n`;
        });
      }

      Alert.alert('SQLite 데이터베이스', dataText, [
        { text: '확인' },
        {
          text: '오늘만 초기화',
          style: 'default',
          onPress: handleResetData,
        },
        {
          text: '전체 데이터 삭제',
          style: 'destructive',
          onPress: handleClearAllData,
        },
      ]);
    } catch (error) {
      Alert.alert('오류', `데이터베이스 확인 실패: ${error}`);
    }
  };

  // 데이터 초기화 함수
  const handleResetData = () => {
    Alert.alert(
      'Reset Data',
      "Are you sure you want to reset today's step data?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: resetTodayData,
        },
      ],
    );
  };

  // 전체 데이터 삭제 함수
  const handleClearAllData = () => {
    Alert.alert(
      '전체 데이터 삭제',
      '정말로 모든 걸음수 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: clearAllDatabaseData,
        },
      ],
    );
  };

  // 전체 데이터베이스 초기화
  const clearAllDatabaseData = async () => {
    try {
      const stepTrackerService =
        require('../services/stepTrackerService').default;
      await stepTrackerService.clearAllDatabaseData();
      Alert.alert('성공', '모든 걸음수 데이터가 삭제되었습니다.');
    } catch (error) {
      Alert.alert('오류', `데이터 삭제 실패: ${error}`);
    }
  };

  // 오늘 데이터 초기화
  const resetTodayData = async () => {
    try {
      const stepTrackerService =
        require('../services/stepTrackerService').default;
      await stepTrackerService.resetTodayData();
      Alert.alert('성공', '오늘 걸음수 데이터가 초기화되었습니다.');
    } catch (error) {
      Alert.alert('오류', `데이터 초기화 실패: ${error}`);
    }
  };

  // 걸음수 추적 시작 함수
  const startStepTracking = async () => {
    if (isStepTrackingStarted) {
      console.log('⚠️ 걸음수 추적이 이미 시작되었습니다.');
      return;
    }

    console.log('🏃‍♂️ 걸음수 추적 시작...');
    try {
      const stepTrackerService =
        require('../services/stepTrackerService').default;

      // 초기화
      const initResult = await stepTrackerService.initialize();
      console.log('✅ StepTracker 초기화 결과:', initResult);

      // 추적 시작
      const startResult = await stepTrackerService.startTracking();
      console.log('✅ 걸음수 추적 시작 성공:', startResult);

      setIsStepTrackingStarted(true);

      // 디버깅용 - 데이터베이스 상태 확인
      // setTimeout(() => {
      //   console.log('🔍 데이터베이스 상태 확인 중...');
      //   checkDatabaseData();
      // }, 3000); // 3초 후 데이터베이스 확인
    } catch (error) {
      console.error('❌ 걸음수 추적 시작 실패:', error);
    }
  };

  // URL 변경 감지 및 자동 데이터 전송
  const handleNavigationStateChangeWithAutoData = (navState: any) => {
    // 기본 네비게이션 상태 변경 처리
    handleNavigationStateChange(navState);

    // URL 체크 및 자동 데이터 전송
    if (navState.url) {
      // /walk 경로 또는 홈(/) 경로에서 데이터 전송
      const isWalkPage = navState.url.includes('/walk');
      const isHomePage =
        navState.url.endsWith('/') || navState.url.match(/\/$|\/\?|\/\#/);

      if (isHomePage) {
        const currentTime = Date.now();
        const timeSinceLastCall = currentTime - lastApiCallTime;

        // 3초 이내 중복 호출 방지
        if (timeSinceLastCall < 3000) {
          console.log('⏰ 3초 이내 중복 호출 방지됨');
          return;
        }

        console.log('🏠 홈(/) 경로 감지 - 자동 기능 시작');
        console.log(`📍 현재 URL: ${navState.url}`);

        setLastApiCallTime(currentTime);

        // 1. 걸음수 추적 시작 (한 번만)
        if (!hasInitializedAPIs) {
          setTimeout(() => {
            startStepTracking();
          }, 500); // 0.5초 후 추적 시작

          // 3. FCM 토큰 추출 요청 (한 번만) - iOS에서만 실행
          if (Platform.OS === 'ios') {
            setTimeout(() => {
              console.log('🍎 iOS용 JWT 토큰 추출 시도 (3초 후)');
              requestJwtTokenFromWebView();
            }, 3000); // 3초 후 추출 요청 (iOS에서는 더 늦게)

            // 추가로 5초 후에도 한 번 더 시도
            setTimeout(() => {
              console.log('🍎 iOS용 JWT 토큰 추출 재시도 (5초 후)');
              requestJwtTokenFromWebView();
            }, 5000);
          }

          setHasInitializedAPIs(true); // 중복 실행 방지
        }

        // 2. 센서 데이터 API 전송 (3초 간격으로 제한)
        setTimeout(() => {
          sendSensorStepDataToAPI();
        }, 1000); // 1초 후 전송 (페이지 로딩 완료 후)
      }
    }
  };

  // 카카오톡 공유 처리 함수
  const handleKakaoShare = async (data: {
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
  }) => {
    console.log('💬 카카오톡 공유 실행:', data);

    const { Linking, Platform } = require('react-native');

    const title = data.title || '루틴케어 가족 초대';
    const description = data.description || '루틴케어에서 건강을 함께 관리해요';
    const shareMessage = `${title}\n${description}\n\n${data.url}`;

    try {
      if (Platform.OS === 'android') {
        // Android: 카카오톡으로 직접 텍스트 전송
        const encodedMessage = encodeURIComponent(shareMessage);
        const kakaoUrl = `kakaolink://send?msg=${encodedMessage}`;

        const canOpen = await Linking.canOpenURL(kakaoUrl);
        if (canOpen) {
          await Linking.openURL(kakaoUrl);
          console.log('✅ 카카오톡 공유 성공');
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'KAKAO_SHARE_RESULT',
                success: true,
              }),
            );
          }
        } else {
          // 카카오톡이 설치되지 않은 경우 일반 공유
          console.log('⚠️ 카카오톡이 설치되지 않음, 일반 공유로 fallback');
          fallbackToSystemShare(data, shareMessage);
        }
      } else {
        // iOS: 일반 공유 시트 사용 (카카오톡 포함)
        fallbackToSystemShare(data, shareMessage);
      }
    } catch (error) {
      console.error('❌ 카카오톡 공유 실패:', error);
      // 오류 시 일반 공유로 fallback
      fallbackToSystemShare(data, shareMessage);
    }
  };

  // 시스템 공유 시트로 fallback
  const fallbackToSystemShare = (
    data: {
      url: string;
      title?: string;
      description?: string;
      imageUrl?: string;
    },
    shareMessage: string,
  ) => {
    const { Share } = require('react-native');
    const title = data.title || '루틴케어 가족 초대';

    Share.share({
      message: shareMessage,
      url: data.url,
      title: title,
    })
      .then((result: any) => {
        if (result.action === Share.sharedAction) {
          console.log('✅ 공유 성공');
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'KAKAO_SHARE_RESULT',
                success: true,
              }),
            );
          }
        } else if (result.action === Share.dismissedAction) {
          console.log('ℹ️ 공유 취소됨');
          if (webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'KAKAO_SHARE_RESULT',
                success: false,
                message: '공유가 취소되었습니다.',
              }),
            );
          }
        }
      })
      .catch((error: any) => {
        console.error('❌ 공유 실패:', error);
        if (webViewRef.current) {
          webViewRef.current.postMessage(
            JSON.stringify({
              type: 'KAKAO_SHARE_RESULT',
              success: false,
              error: error.message,
            }),
          );
        }
      });
  };

  // 권한 요청
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const hasPermission =
          await PermissionManager.checkActivityRecognitionPermission();
        if (!hasPermission) {
          const granted =
            await PermissionManager.requestActivityRecognitionPermission();
          if (!granted) {
            PermissionManager.showPermissionDeniedAlert();
          }
        }
      } catch (error) {
        console.error('Permission request failed:', error);
      }
    };

    requestPermissions();
  }, []);

  // Firebase 메시징 이벤트 리스너
  useEffect(() => {
    const { FirebaseMessagingModule } = NativeModules;

    if (FirebaseMessagingModule) {
      const eventEmitter = new NativeEventEmitter(FirebaseMessagingModule);

      const subscription = eventEmitter.addListener(
        'onForegroundMessage',
        event => {
          console.log('Foreground message received:', event);
          if (event && event.message && webViewRef.current) {
            webViewRef.current.postMessage(event.message);
          }
        },
      );

      return () => {
        subscription.remove();
      };
    }
  }, [webViewRef]);

  // 앱 시작 시 권한만 요청 (걸음수 추적은 홈 접근 시에만)
  useEffect(() => {
    console.log('📱 앱 시작 - 권한 요청만 수행');
    // 걸음수 추적은 홈 페이지 접근 시에만 시작
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  const handleWebViewMessage = async (messageData: string) => {
    try {
      // 데이터 유효성 검사 - 문자열인지 확인
      if (!messageData || typeof messageData !== 'string') {
        console.warn(
          '⚠️ WebView 메시지 데이터가 유효하지 않습니다:',
          typeof messageData,
        );
        return;
      }

      const message = JSON.parse(messageData);
      console.log('📨 WebView 메시지 수신:', message.type || 'unknown');

      // 메시지 타입 검사
      if (!message || !message.type) {
        console.warn('⚠️ 메시지 타입이 없습니다:', message);
        return;
      }

      switch (message.type) {
        case 'KAKAO_SHARE':
          // 카카오톡 공유 요청 처리
          console.log('💬 카카오톡 공유 요청:', message);
          handleKakaoShare({
            url: message.url,
            title: message.title,
            description: message.description,
            imageUrl: message.imageUrl,
          });
          break;

        case 'JWT_TOKEN_RESULT':
          // localStorage에서 추출한 JWT 토큰 저장 및 FCM API 호출
          console.log(
            '🔍 JWT 토큰 결과 받음:',
            JSON.stringify(message.data, null, 2),
          );

          if (message.data && message.data.token) {
            await AsyncStorage.setItem('jwtToken', message.data.token);
            console.log('✅ JWT 토큰 임시 저장 완료');
            console.log('📊 추가 정보:', {
              foundKey: message.data.foundKey,
              totalKeys: message.data.totalKeys,
              allKeys: message.data.allKeys,
            });
            // 토큰 저장 후 FCM API 전송
            sendFCMTokenToAPI(message.data.token);
          } else {
            console.error('❌ localStorage에서 JWT 토큰을 찾을 수 없습니다.');
            console.error('🔍 디버그 정보:', {
              error: message.data?.error,
              totalKeys: message.data?.totalKeys,
              allKeys: message.data?.allKeys,
            });
          }
          break;

        case 'REQUEST_FCM_TOKEN':
          const fcmToken = await fcmService.getFcmToken();
          if (fcmToken && webViewRef.current) {
            webViewRef.current.postMessage(
              JSON.stringify({
                type: 'FCM_TOKEN_RESPONSE',
                data: { fcmToken },
              }),
            );
          }
          break;

        case 'REQUEST_SAMSUNG_HEALTH':
          console.log('Samsung Health 데이터 요청 수신');
          sendSamsungHealthDataToAPI();
          break;

        default:
          console.log('❓ 알 수 없는 메시지 타입:', message.type);
          console.log('📄 메시지 전체:', JSON.stringify(message, null, 2));
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('❌ JSON 파싱 오류:', error.message);
        console.error('📄 원본 데이터:', messageData?.substring(0, 100));
      } else {
        console.error('❌ WebView 메시지 처리 오류:', error);
      }
    }
  };

  const handleWebViewError = (error: WebViewError) => {
    console.error('WebView 오류:', error);
  };

  // 뒤로가기 버튼 핸들링 (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (navigationState.canGoBack) {
        goBack();
        return true;
      } else {
        Alert.alert(
          '앱 종료',
          '앱을 종료하시겠습니까?',
          [
            { text: '취소', style: 'cancel', onPress: () => {} },
            {
              text: '종료',
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: true },
        );
        return true; // 기본 동작 막기
      }
    };
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress,
    );
    return () => subscription.remove();
  }, [navigationState.canGoBack]);

  return (
    <SafeAreaView style={styles.container}>
      <CustomWebView
        config={currentConfig}
        onNavigationStateChange={handleNavigationStateChangeWithAutoData}
        onMessage={handleWebViewMessage}
        onError={handleWebViewError}
        webViewRef={webViewRef}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
});
