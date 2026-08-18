import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { splashStyles } from '../styles/splashStyles';
import IconLogo from '../styles/asset/svg/icon_splashLogo.svg';
interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  // 애니메이션 관련 코드 제거

  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1500); // 1.5초 동안 표시
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <SafeAreaView style={splashStyles.container}>
      <View style={splashStyles.logoContainer}>
        {/* 서브 타이틀 */}
        <Text style={splashStyles.subtitle}>실천이 쌓이고</Text>
        <Text style={splashStyles.subtitle}>습관이 되는,</Text>
        {/* 메인 타이틀 */}
        <Text style={splashStyles.title}>루틴케어</Text>
      </View>
      <View style={splashStyles.middleContainer}>
        {/* 로고 아이콘 */}
        <IconLogo />
      </View>
      {/* 태그라인 */}
      <View style={splashStyles.bottomContainer}>
        <Text style={splashStyles.tagline}>Insystem Co., Ltd.</Text>
      </View>
    </SafeAreaView>
  );
}
