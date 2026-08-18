export interface WebViewConfig {
  url: string;
  title?: string;
  showHeader?: boolean;
  allowsBackForwardNavigationGestures?: boolean;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
}

export interface NavigationState {
  canGoBack: boolean;
  canGoForward: boolean;
  loading: boolean;
  url: string;
  title: string;
}

export interface WebViewError {
  code: number;
  description: string;
  domain: string;
}

export interface WebViewMessage {
  data: string;
  origin?: string;
}

// Navigation types
export * from './navigation';

// Step Tracker types
export * from './stepTracker';
