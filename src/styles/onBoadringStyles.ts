import { StyleSheet } from 'react-native';

export const onBoadringStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
  },
  logoContainer: {},
  title: {
    fontFamily: 'Pretendard-Medium',
    fontSize: 20,
    // fontWeight: '500',
    color: '#262626',
    textAlign: 'center',
  },
  boldSpan: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 20,
    // fontWeight: '700',
    color: '#262626',
    textAlign: 'center',
  },
  middleContainer: {
    marginTop: 24,
    height: 378,
    marginBottom: 35,
  },
  onBoardingImage: {
    resizeMode: 'contain',
  },
  onAiBox: {
    position: 'absolute',
    top: 20,
  },
  bottomContainer: {
    transform: 'translateY(-70px)',
    flexDirection: 'row', // 가로 정렬
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: 35,
    borderRadius: 10,
  },
  ellipse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 6,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },

  nextButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F57C00',
    justifyContent: 'center',
    alignItems: 'center',
  },

  nextButtonText: {
    fontFamily: 'Pretendard-Medium',
    color: '#F57C00',
    fontSize: 16,
    // fontWeight: '500',
    lineHeight: 24,
  },
});
