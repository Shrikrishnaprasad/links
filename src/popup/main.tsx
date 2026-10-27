import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { applyTheme } from '../services/theme';

applyTheme();
import { PopupApp } from './PopupApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
