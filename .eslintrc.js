module.exports = {
  root: true,
  ignorePatterns: ['dist/', 'node_modules/'],
  extends: [
    '@react-native',
    'eslint:recommended'
  ],
  env: {
    browser: true,
    node: true,
    serviceworker: true,
    es6: true
  },
  globals: {
    // Service Worker 전역 변수들
    self: 'readonly',
    caches: 'readonly',
    clients: 'readonly',
    registration: 'readonly',
    Request: 'readonly',
    Response: 'readonly',
    // Browser APIs
    Notification: 'readonly',
    localStorage: 'readonly',
    window: 'readonly',
    document: 'readonly',
    navigator: 'readonly',
    // React Native
    __DEV__: 'readonly'
  },
  rules: {
    // 인라인 스타일 경고 비활성화
    'react-native/no-inline-styles': 'off',
    // 사용하지 않는 변수 경고를 에러로 변경하지 않음
    'no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    // console.log 허용
    'no-console': 'off',
    // 빈 catch 블록 허용
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Promise 반환값 사용하지 않아도 됨
    'no-unused-expressions': 'off'
  },
  overrides: [
    {
      // Service Worker 파일들에 대한 특별 설정
      files: ['sw.js', 'service-worker.js', '**/sw/**/*.js'],
      env: {
        serviceworker: true,
        browser: true,
        node: false
      },
      globals: {
        self: 'readonly',
        caches: 'readonly',
        clients: 'readonly',
        registration: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        fetch: 'readonly'
      }
    },
    {
      // PWA 관련 파일들
      files: ['pwa-*.js', '**/pwa/**/*.js', 'web-demo.html'],
      env: {
        browser: true,
        node: false
      },
      globals: {
        Notification: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly'
      }
    },
    {
      // 웹 컴포넌트 파일들
      files: ['src/utils/web*.js'],
      rules: {
        'react-native/no-inline-styles': 'off'
      }
    }
  ]
};
