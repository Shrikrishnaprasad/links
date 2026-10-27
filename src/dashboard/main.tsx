import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { applyTheme } from '../services/theme';

applyTheme();
import { DashboardApp } from './DashboardApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>,
);
