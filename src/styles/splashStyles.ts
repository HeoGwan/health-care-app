import { StyleSheet } from 'react-native';

export const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingLeft: 32,
    // paddingRight: 32,
    paddingTop: 72,
    paddingBottom: 65,
    backgroundColor: '#FFFFFF',
    // alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  logoEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    color: '#404040',
    fontFamily: 'SBAggroM',
    textAlign: 'left',
    lineHeight: 50.4,
  },
  subtitle: {
    fontSize: 32,
    color: '#404040',
    // marginBottom: 8,
    fontFamily: 'SBAggroL',
    textAlign: 'left',
    lineHeight: 44.8,
  },
  middleContainer: {
    alignItems: 'flex-end',
  },
  bottomContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: 16,
    color: '#404040',
    textAlign: 'center',
    fontFamily: 'SBAggroL',
  },
});
