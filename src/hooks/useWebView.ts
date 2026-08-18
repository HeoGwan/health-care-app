import { useState, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import { NavigationState } from '../types';

export const useWebView = (initialUrl: string) => {
  const webViewRef = useRef<WebView>(null);
  const [navigationState, setNavigationState] = useState<NavigationState>({
    canGoBack: false,
    canGoForward: false,
    loading: false,
    url: initialUrl,
    title: '',
  });

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    setNavigationState({
      canGoBack: navState.canGoBack,
      canGoForward: navState.canGoForward,
      loading: navState.loading,
      url: navState.url,
      title: navState.title || '',
    });
  };

  const goBack = () => {
    if (webViewRef.current && navigationState.canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const goForward = () => {
    if (webViewRef.current && navigationState.canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const reload = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const goHome = (homeUrl?: string) => {
    const targetUrl = homeUrl || initialUrl;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window.location.href = '${targetUrl}';`,
      );
    }
  };

  const navigateToUrl = (url: string) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`window.location.href = '${url}';`);
    }
  };

  return {
    webViewRef,
    navigationState,
    handleNavigationStateChange,
    goBack,
    goForward,
    reload,
    goHome,
    navigateToUrl,
  };
};
