import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

// Function to safely get root element
const getRootElement = () => {
  const element = document.getElementById('root');
  if (!element) {
    // Create root element if it doesn't exist
    const rootDiv = document.createElement('div');
    rootDiv.id = 'root';
    document.body.appendChild(rootDiv);
    return rootDiv;
  }
  return element;
};

// Get or create the root element
const container = getRootElement();

// Create root and render the app
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);