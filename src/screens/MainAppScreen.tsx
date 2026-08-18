import React, { useEffect, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WebViewScreen } from './WebViewScreen';
import { COLORS } from '../constants';
import { Linking } from 'react-native';

function MainAppScreen() {
  const [initialUrl, setInitialUrl] = useState(
    'https://routine-care.insystem.kr',
  );
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) setInitialUrl(url);
    });
  }, []);
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <WebViewScreen
          initialConfig={{
            url: initialUrl,
            title: 'RoutineCare',
            showHeader: true,
            javaScriptEnabled: true,
            domStorageEnabled: true,
          }}
        />
      </View>
    </SafeAreaProvider>
  );
}

export default MainAppScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.WHITE,
  },
});
