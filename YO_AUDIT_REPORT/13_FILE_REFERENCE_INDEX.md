# 13 — Source File Reference Index

Below is the cross-referenced index linking key application capabilities to their source files:

| Subsystem / Capability | Primary Source File | Key Functions / Components |
| :--- | :--- | :--- |
| **App Entry & Audio Unlock** | `src/main.tsx` | Pointer-down speech unlock, StatusBar init |
| **Theme & Root Wrapper** | `src/App.tsx` | Dark/light class management, AuthProvider |
| **Main Orchestrator** | `src/components/yo/YoApp.tsx` | Tab state, Realtime channels, ChatView, Message dispatch |
| **Avatar Generator** | `src/components/yo/Avatar.tsx` | Hue calculation, initials fallback, remote image |
| **Audio Alert Synthesizer** | `src/services/feedback/SoundEffectsService.ts` | Zero-weight Web Audio chimes, bubble pop |
| **Voice Announcer & TTS** | `src/services/voice/VoiceAssistantService.ts` | Native Android TTS, Web Speech fallback, tone player |
| **Haptics Provider** | `src/services/feedback/HapticsService.ts` | Capacitor Haptics light, medium, heavy, selection |
| **Local Push Notifications** | `src/services/notifications/NotificationService.ts` | Android high-importance notification channel |
| **WebRTC & Calling** | `src/features/calls/webrtc/WebRTCService.ts` | RTCPeerConnection, SDP offer/answer, ICE candidates |
| **Call UI Overlay** | `src/features/calls/components/CallOverlay.tsx` | Video elements, call controls, ringing screen |
| **Outbox & Optimistic Sending** | `src/features/messaging/services/MessageOutboxService.ts` | Generate client ID, send RPC call, optimistic fallback |
| **Receipt Dispatcher** | `src/features/messaging/services/ReceiptService.ts` | Acknowledge delivery, acknowledge read |
| **Status (Stories) UI** | `src/features/status/components/UpdatesHomeScreen.tsx` | WhatsApp updates list: Recent, Viewed, Muted |
| **Status Viewer** | `src/features/status/components/StatusViewerModal.tsx` | Multi-bar timer, tap nav, viewers sheet |
| **Status Creator** | `src/features/status/components/AddStatusModal.tsx` | Gradient text, camera/gallery media upload |
| **Status Service** | `src/features/status/services/StatusService.ts` | 24h query, viewer logging, mute publisher |
| **Supabase Client Singleton** | `src/services/supabase/client.ts` | Client initialization using env credentials |
| **Database Migrations** | `supabase/migrations/` | 001 to 005 PostgreSQL schemas & RPCs |
