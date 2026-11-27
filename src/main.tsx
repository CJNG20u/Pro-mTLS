import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initPWAInstallListener} from './hooks/usePWAInstall.ts';

initPWAInstallListener();

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {scope: '/'}).catch(() => {
      // Unsupported or non-secure origin (installing needs HTTPS or localhost)
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
