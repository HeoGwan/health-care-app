import React from 'react';
import { StyleSheet } from 'react-native';

// Web에서 SafeAreaProvider 대체
export const SafeAreaProvider = ({ children, ...props }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Web에서 SafeAreaView 대체
export const SafeAreaView = ({ children, style, ...props }) => {
  const flattenedStyle = StyleSheet.flatten(style) || {};

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minHeight: 0,
        boxSizing: 'border-box',
        ...flattenedStyle,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// useSafeAreaInsets 훅 대체
export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});
