import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function svgAsReactImage() {
  return {
    name: 'svg-as-react-image',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.svg')) return null;

      return `
        import React from 'react';
        import assetUrl from ${JSON.stringify(`${id}?url`)};

        export default function SvgImage(props) {
          return React.createElement('img', {
            ...props,
            src: assetUrl,
            alt: props.alt || '',
          });
        }
      `;
    },
  };
}

export default defineConfig({
  // The existing web shims use JSX in .js files, so include them explicitly.
  plugins: [svgAsReactImage(), react({ include: /\.[jt]sx?$/ })],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
      'react-native-webview': path.resolve(
        __dirname,
        'src/utils/webWebView.jsx',
      ),
      'react-native-safe-area-context': path.resolve(
        __dirname,
        'src/utils/webSafeArea.jsx',
      ),
      'react-native-sensors': path.resolve(
        __dirname,
        'src/utils/webSensors.ts',
      ),
    },
    extensions: [
      '.web.js',
      '.js',
      '.web.jsx',
      '.jsx',
      '.web.ts',
      '.ts',
      '.web.tsx',
      '.tsx',
      '.json',
    ],
  },
  define: {
    global: 'globalThis',
    __DEV__: true,
  },
  optimizeDeps: {
    include: ['react-native-web'],
  },
  server: {
    port: 3000,
    open: true,
  },
});
