
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Create an explicit runtime check to ensure the environment is properly loaded
document.addEventListener('DOMContentLoaded', () => {
  // Make sure React is properly loaded
  if (!React) {
    console.error('React is not loaded properly');
  }
  
  if (!ReactDOM) {
    console.error('ReactDOM is not loaded properly');
  }
  
  // Log successful initialization
  console.log('Application initializing...');
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
