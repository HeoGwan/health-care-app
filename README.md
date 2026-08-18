# Health Care App

간단하고 확장 가능한 React Native 웹뷰 기반 헬스케어 애플리케이션입니다.

## 🏗️ 아키텍처 구조

```
src/
├── components/          # 재사용 가능한 컴포넌트
│   ├── CustomWebView.tsx    # 웹뷰 컴포넌트
│   ├── WebViewHeader.tsx    # 웹뷰 헤더 (네비게이션 컨트롤)
│   └── index.ts
├── screens/            # 화면 컴포넌트
│   ├── WebViewScreen.tsx    # 메인 웹뷰 스크린
│   └── index.ts
├── hooks/              # 커스텀 훅
│   ├── useWebView.ts        # 웹뷰 상태 관리 훅
│   └── index.ts
├── utils/              # 유틸리티 함수
│   ├── webViewUtils.ts      # 웹뷰 관련 유틸리티
│   └── index.ts
├── types/              # TypeScript 타입 정의
│   └── index.ts
├── constants/          # 상수 정의
│   └── index.ts
└── index.ts           # 메인 export 파일
```

## 🚀 주요 기능

- **구조화된 아키텍처**: 컴포넌트, 스크린, 훅, 유틸리티 분리
- **TypeScript 지원**: 완전한 타입 안정성
- **웹뷰 네비게이션**: 뒤로 가기, 앞으로 가기, 새로고침
- **로딩 상태 표시**: 페이지 로딩 중 인디케이터
- **에러 핸들링**: 웹뷰 에러 처리
- **URL 유효성 검사**: 안전한 URL 처리
- **커스터마이징 가능**: 설정을 통한 기능 제어

## 📱 사용법

### 기본 사용법

```tsx
import { WebViewScreen } from './src/screens/WebViewScreen';

function App() {
  return (
    <WebViewScreen
      initialConfig={{
        url: 'https://example.com',
        showHeader: true,
        javaScriptEnabled: true,
        domStorageEnabled: true,
      }}
    />
  );
}
```

## 🛠️ 개발 환경 설정

### 설치

```bash
npm install
```

### Android 실행

```bash
npx react-native run-android
```

### iOS 실행 (macOS만)

```bash
cd ios && pod install
npx react-native run-ios
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
