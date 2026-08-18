import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import {
  WebViewErrorEvent,
  WebViewMessageEvent,
} from 'react-native-webview/lib/WebViewTypes';
import { WebViewConfig, WebViewError } from '../types';
import { DEFAULT_CONFIG } from '../constants';

interface CustomWebViewProps {
  config: WebViewConfig;
  onNavigationStateChange?: (navState: any) => void;
  onError?: (error: WebViewError) => void;
  onMessage?: (message: string) => void;
  onLoad?: () => void;
  webViewRef?: React.RefObject<WebView | null>;
}

export const CustomWebView: React.FC<CustomWebViewProps> = ({
  config,
  onNavigationStateChange,
  onError,
  onMessage,
  onLoad,
  webViewRef,
}) => {
  const handleError = (syntheticEvent: WebViewErrorEvent) => {
    const { nativeEvent } = syntheticEvent;
    const error: WebViewError = {
      code: nativeEvent.code,
      description: nativeEvent.description,
      domain: nativeEvent.domain || '',
    };

    console.error('WebView Error:', error);

    if (onError) {
      onError(error);
    } else {
      Alert.alert(
        '페이지 로드 오류',
        `${error.description} (코드: ${error.code})`,
        [{ text: '확인' }],
      );
    }
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = event.nativeEvent.data;
    console.log('WebView Message:', message);

    if (onMessage) {
      onMessage(message);
    }
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    // 외부 앱으로 열어야 하는 링크 처리 (예: mailto:, tel: 등)
    const { url } = request;

    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      // 외부 앱에서 처리하도록 false 반환
      return false;
    }

    return true;
  };

  // WebView에 삼성헬스 및 FCM 관련 함수들 주입
  const injectedJS = `
    // Samsung Health 데이터 요청
    window.getSamsungHealth = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'getSamsungHealth' }));
    };
    
    // FCM 토큰 요청
    window.getFcmToken = function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'getFcmToken' }));
    };
    
    // FCM 토픽 구독
    window.subscribeTopic = function(topic) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'subscribeTopic', 
        data: { topic: topic } 
      }));
    };
    
    // FCM 토픽 구독 해제
    window.unsubscribeTopic = function(topic) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'unsubscribeTopic', 
        data: { topic: topic } 
      }));
    };
    
    // 웹앱에서 네이티브 응답 수신을 위한 이벤트 리스너
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        
        // Samsung Health 데이터 응답
        if (data.type === 'samsungHealth' && window.onSamsungHealthData) {
          window.onSamsungHealthData(data.data);
        }
        
        // FCM 토큰 응답
        if (data.type === 'fcmToken' && window.onFcmToken) {
          window.onFcmToken(data.data);
        }
        
        // 토픽 구독 응답
        if (data.type === 'topicSubscribed' && window.onTopicSubscribed) {
          window.onTopicSubscribed(data.data);
        }
        
        // 토픽 구독 해제 응답
        if (data.type === 'topicUnsubscribed' && window.onTopicUnsubscribed) {
          window.onTopicUnsubscribed(data.data);
        }
      } catch (e) {
        console.warn('WebView message parse error:', e);
      }
    });
    
    console.log('Healthcare WebView Bridge API 로드 완료');
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: config.url }}
        style={styles.webview}
        javaScriptEnabled={
          config.javaScriptEnabled ?? DEFAULT_CONFIG.JAVASCRIPT_ENABLED
        }
        domStorageEnabled={
          config.domStorageEnabled ?? DEFAULT_CONFIG.DOM_STORAGE_ENABLED
        }
        allowsBackForwardNavigationGestures={
          config.allowsBackForwardNavigationGestures ??
          DEFAULT_CONFIG.ALLOWS_BACK_FORWARD_GESTURES
        }
        startInLoadingState={true}
        scalesPageToFit={true}
        onNavigationStateChange={onNavigationStateChange}
        onError={handleError}
        onMessage={handleMessage}
        onLoad={onLoad}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        // 추가 보안 설정
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        injectedJavaScript={injectedJS}
        // iOS 전용 localStorage 관련 설정
        cacheEnabled={true}
        incognito={false}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        // iOS WebView localStorage 지원 강화
        onLoadEnd={() => {
          console.log('📱 WebView 로드 완료 - localStorage 사용 가능');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
