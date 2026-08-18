import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.web';

// Create a wrapper component for web
const WebApp = () => {
  return <App />;
};

// Get the root element
const container = document.getElementById('root');
const root = createRoot(container);

// Render the app
root.render(<WebApp />);
