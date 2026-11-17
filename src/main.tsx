import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { VoiceAssistantService } from './services/voice/VoiceAssistantService'
import { NotificationService } from './services/notifications/NotificationService'

if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setStyle({ style: Style.Default }).catch(() => {});
}

// Pre-initialize notification channels on app startup
NotificationService.init().catch(() => {});

// Unlock speech synthesis & audio on first user touch / pointer gesture
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    VoiceAssistantService.unlock();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
