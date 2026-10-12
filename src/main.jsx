import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Giữ nguyên import CSS của bạn

const container = document.getElementById('root');

if (container.hasChildNodes()) {
  hydrateRoot(container, <App />);
} else {
  const root = createRoot(container);
  root.render(<App />);
}