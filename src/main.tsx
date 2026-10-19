import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SetupNeeded from './pages/SetupNeeded';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { isConfigured } from './lib/supabase';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isConfigured ? (
      <ToastProvider>
        <AuthProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </ToastProvider>
    ) : (
      <SetupNeeded />
    )}
  </StrictMode>,
);
