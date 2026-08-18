import React, { useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Animated,
  Image,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { onBoadringStyles } from '../styles/onBoadringStyles';
import IconSparkle from '../styles/asset/svg/icon_sparkle.svg';
import IconOnBoarding01 from '../styles/asset/img/icon_onBoarding01.png';
import IconOnBoarding02 from '../styles/asset/img/icon_onBoarding02.png';
import IconOnBoarding03 from '../styles/asset/img/icon_onBoarding03.png';

interface OnBoardingProps {
  onFinish: () => void;
}

// 개별 페이지 컴포넌트 (애니메이션 포함)
type OnBoardingPageProps = {
  item: any;
  index: number;
  isActive: boolean;
  width: number;
  imageHeight: number;
};

const OnBoardingPage = ({
  item,
  index,
  isActive,
  width,
  imageHeight,
}: OnBoardingPageProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isActive) {
      // 활성 페이지일 때 애니메이션 시작
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(100),
      ]).start();
    } else {
      // 비활성 페이지는 즉시 표시
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, [fadeAnim, isActive, scaleAnim]);

  return (
    <View
      style={{
        width,
        flex: 1,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* 메인 타이틀 */}
      <Animated.View
        style={[
          onBoadringStyles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
            marginTop: 20,
          },
        ]}
      >
        <Text style={onBoadringStyles.title}>
          <Text style={onBoadringStyles.boldSpan}>{item.topBoldTitle}</Text>
          {item.topTitle}
        </Text>
        <Text style={onBoadringStyles.title}>
          <Text style={onBoadringStyles.boldSpan}>{item.bottomBoldTitle}</Text>
          {item.bottomTitle}
          {item.bottomBoldTitle02 && (
            <Text style={onBoadringStyles.boldSpan}>
              {item.bottomBoldTitle02}
            </Text>
          )}
          {item.bottomTitle02}
        </Text>
      </Animated.View>

      {/* 이미지 컨테이너 */}
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            alignItems: 'center',
            // justifyContent: 'center',
            flex: 1,
            width: '100%',
            marginBottom: 34,
            padding: 8,
          },
        ]}
      >
        <Image
          source={item.imgSource}
          style={{
            width: width * 0.8,
            height: imageHeight,
            resizeMode: 'contain',
          }}
        />
        {index === 1 && (
          <View style={[onBoadringStyles.onAiBox, { left: 55 }]}>
            <IconSparkle />
          </View>
        )}
      </Animated.View>

      {/* 하단 컨테이너 */}
      <Animated.View
        style={[
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            marginBottom: 20,
          },
        ]}
      >
        {/* 빈 공간 - dot indicator는 FlatList 외부에서 관리 */}
      </Animated.View>
    </View>
  );
};

export const OnBoarding: React.FC<OnBoardingProps> = props => {
  const { onFinish } = props;
  const [currentStep, setCurrentStep] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const width = Platform.OS === 'web' ? Math.min(windowWidth, 375) : windowWidth;
  const imageHeight =
    Platform.OS === 'web'
      ? Math.max(280, Math.min(600, windowHeight - 250))
      : 600;
  const insets = useSafeAreaInsets();
  const pages = [
    {
      topBoldTitle: '식단, 걷기, 복약',
      topTitle: '을 한번에 관리하고,',
      bottomBoldTitle: '포인트',
      bottomTitle: '도 쌓이는 똑똑한 습관!',
      imgSource: IconOnBoarding01,
    },
    {
      topBoldTitle: '음식사진 한 장',
      topTitle: '으로 간편하게,',
      bottomBoldTitle: '칼로리와 탄단지',
      bottomTitle: 'AI가 ',
      bottomTitle02: ' 스캔!',
      imgSource: IconOnBoarding02,
    },
    {
      topBoldTitle: 'AI',
      topTitle: '가 분석한 루틴 실천',
      bottomBoldTitle: '건강 점수',
      bottomTitle: '와 ',
      bottomBoldTitle02: '건강 리포트 ',
      bottomTitle02: '제공',
      imgSource: IconOnBoarding03,
    },
  ];

  const handleScroll = (event: any) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentStep(page);
  };

  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep >= pages.length) return;

    // React Native Web에서는 scrollToIndex 대신 명시적인 오프셋을 사용합니다.
    setCurrentStep(nextStep);
    if (Platform.OS === 'web') {
      flatListRef.current?.scrollToOffset({
        offset: nextStep * width,
        animated: true,
      });
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: nextStep,
      animated: true,
    });
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
    } catch (e) {}
    onFinish();
  };

  return (
    <SafeAreaView
      style={[
        onBoadringStyles.container,
        { flex: 1 },
        Platform.OS === 'web' && {
          height: windowHeight,
          maxHeight: windowHeight,
          minHeight: 0,
          overflow: 'hidden',
        },
      ]}
    >
      <FlatList
        ref={flatListRef}
        data={pages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, idx) => idx.toString()}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        style={{ flex: 1, minHeight: 0 }}
        renderItem={({ item, index }) => (
          <OnBoardingPage
            item={item}
            index={index}
            isActive={currentStep === index}
            width={width}
            imageHeight={imageHeight}
          />
        )}
      />

      {/* 하단 버튼 */}
      <View
        style={[
          onBoadringStyles.fixedButtonContainer,
          {
            bottom: Math.max(insets.bottom, 0),
            paddingTop: 0,
            paddingBottom: 12,
            paddingHorizontal: 16,
            borderTopWidth: 0,
          },
        ]}
      >
        {/* Dot Indicator - 버튼 위로 이동 */}
        <View
          style={[
            onBoadringStyles.bottomContainer,
            { marginBottom: -65, backgroundColor: 'transparent' },
          ]}
        >
          {pages.map((_, i) => (
            <View
              key={i}
              style={[
                onBoadringStyles.ellipse,
                currentStep === i && { backgroundColor: '#F57C00' },
                i === pages.length - 1 && { marginRight: 0 },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            onBoadringStyles.nextButton,
            currentStep === pages.length - 1 && { backgroundColor: '#F57C00' },
          ]}
          onPress={currentStep === pages.length - 1 ? handleFinish : handleNext}
        >
          <Text
            style={[
              onBoadringStyles.nextButtonText,
              currentStep === pages.length - 1 && { color: '#fff' },
            ]}
          >
            {currentStep === pages.length - 1 ? '시작하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
