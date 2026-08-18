declare module 'react-native-config' {
  export interface NativeConfig {
    BASE_URL?: string;
    API_URL?: string;
    APP_NAME?: string;
    DEBUG_MODE?: string;
    LOG_LEVEL?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}
