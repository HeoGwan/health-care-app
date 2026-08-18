import React from 'react';

// 웹에서 WebView 대체
export const WebView = ({ source, style, ...props }) => {
  const { uri } = source || {};

  return (
    <iframe
      src={uri}
      style={{
        border: 'none',
        width: '100%',
        height: '100%',
        ...style,
      }}
      title="WebView Content"
      {...props}
    />
  );
};

export default WebView;
