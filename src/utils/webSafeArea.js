import React from 'react';

// Web에서 SafeAreaProvider 대체
export const SafeAreaProvider = ({ children, ...props }) => {
  return (
    <div style={{ width: '100%', height: '100%' }} {...props}>
      {children}
    </div>
  );
};

// Web에서 SafeAreaView 대체
export const SafeAreaView = ({ children, style, ...props }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default {
  SafeAreaProvider,
  SafeAreaView,
};
