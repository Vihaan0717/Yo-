# YO!!! — Technical Architecture & Project Context

> **Handoff Guide for AI Engineers and Engineering Leadership**  
> *Generated on: November 18, 2026*  
> *Project: YO!!! Mobile & Web Realtime Messenger*

---

## 1. Executive Summary & Purpose
**YO!!!** is an iOS/WhatsApp-hybrid realtime messaging application engineered with:
- **Frontend**: React 19 (`^19.3.1`) + TypeScript (`~7.0.2`) + Vite (`^8.3.6`) + Tailwind CSS v4 (`^4.3.5`) + Motion (`motion/react` `^14.14.0`).
- **Mobile Container**: Capacitor v8 (`@capacitor/android` `^8.6.2`, `@capacitor/core` `^8.6.2`) targeting Android and mobile web.
- **Backend-as-a-Service**: Supabase (`@supabase/supabase-js` `^2.119.0`) powering PostgreSQL 15+, Supabase Auth, Row Level Security (RLS), and Postgres Changes / Broadcast Realtime.
- **Calling**: Peer-to-peer WebRTC audio and video calling signaled via Supabase Realtime Broadcast.
- **AI Audio & Voice**: Local zero-cost Web SpeechSynthesis (web fallback) + native Android `@capacitor-community/text-to-speech` engine for incoming message spoken announcements, accompanied by synthesized Web Audio API chime alerts (`glass_chime`, `pulse`, `bubble`, `electronic`).

---

## 2. Directory Structure & Key Files

```
c:\Users\anger\OneDrive\Desktop\My projects\Yo!!!
├── android/                             # Android Studio native project
├── public/                              # PWA icons and SVG assets
├── src/
│   ├── App.tsx                          # Root container: initializes theme & checks active session
│   ├── main.tsx                         # Entry point: Capacitor StatusBar & pointer-unlock for audio
│   ├── index.css                        # Tailwind v4 theme, OKLCH glass palette, animations
│   ├── contexts/
│   │   └── AuthContext.tsx              # Supabase session provider & current profile state
│   ├── services/
│   │   ├── auth/IdentityService.ts      # Username validation & RPC claim handling
│   │   ├── feedback/HapticsService.ts   # Device haptics (@capacitor/haptics)
│   │   ├── feedback/SoundEffectsService.ts # Zero-asset Web Audio synthesizer (chimes, bubbles)
│   │   ├── media/ImageService.ts        # Client-side Canvas downscaling & compression
│   │   ├── notifications/NotificationService.ts # Local push & heads-up channel engine
│   │   ├── supabase/client.ts           # Supabase client singleton
│   │   └── voice/VoiceAssistantService.ts # AI Voice announcer & native Android TTS
│   ├── features/
│   │   ├── calls/
│   │   │   ├── webrtc/WebRTCService.ts  # WebRTC peer connection, SDP offer/answer, ICE candidates
│   │   │   └── components/CallOverlay.tsx # Fullscreen calling UI (ringing, video, controls)
│   │   ├── messaging/
│   │   │   ├── services/MessageOutboxService.ts # Optimistic sender & PostgreSQL RPC fallback
│   │   │   ├── services/ReceiptService.ts       # Delivery & read watermark acknowledgements
│   │   │   └── components/              # MessageStatusIndicator, DateSeparator, UnreadSeparator
│   │   └── status/
│   │       ├── services/StatusService.ts # 24h story aggregation, views, audience filters
│   │       └── components/              # UpdatesHomeScreen, AddStatusModal, StatusViewerModal
│   └── components/
│       ├── modals/                      # AuthModal, ThemeModal, GroupModal, NotificationSettingsModal
│       └── yo/
│           ├── YoApp.tsx                # CORE ORCHESTRATOR: Tab navigation, ChatView, Realtime Listeners
│           ├── Avatar.tsx               # Colorful SVG / image avatar generator
│           └── LightboxModal.tsx        # Media preview lightbox
└── supabase/
    └── migrations/                      # 001 to 005 PostgreSQL migration schemas
```

---

## 3. Core Architectural Lifecycles

### A. Message Sending & Delivery Flow
1. **User interaction**: User types text or selects media in `ChatView` inside [YoApp.tsx](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/components/yo/YoApp.tsx).
2. **Optimistic Local Update**: A temporary message ID (`cmsg_<timestamp>_<rand>`) is assigned with status `'sending'`, appended to local React state `msgs`, triggering sound (`SoundEffectsService.playMessageSent()`) and haptics (`HapticsService.medium()`).
3. **Realtime Broadcast**: Message is immediately broadcast over Supabase channel `room_${conversation_id}` and `global_messages_listener` for sub-second UI delivery.
4. **Outbox Persistence**: [MessageOutboxService.send()](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/features/messaging/services/MessageOutboxService.ts) executes PostgreSQL RPC `send_message(p_conversation_id, p_sender_id, p_content, ...)`.
   - RPC enforces conversation membership check (`is_conversation_member`).
   - Increments conversation sequence number and updates `conversations.last_message_preview` / `last_message_at`.
   - Inserts row into `public.messages`.
5. **State Reconciliation**: Successful RPC returns canonical database UUID and `sequence_number`. The optimistic message in React state is updated to status `'sent'` (single checkmark).
6. **Recipient Handshake & Receipts**:
   - The recipient device receives the message via `postgres_changes` / `broadcast`.
   - Receiver calls [ReceiptService.acknowledgeDelivery()](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/features/messaging/services/ReceiptService.ts), inserting into `message_receipts` (`delivered_at`). Sender status updates to `'delivered'` (double checkmarks).
   - When receiver has the chat screen open or reads the message, receiver calls [ReceiptService.acknowledgeConversationRead()](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/features/messaging/services/ReceiptService.ts), setting `read_at`. Sender status updates to `'read'` (blue double checkmarks).

### B. Calling Architecture
1. Caller initiates audio/video in `YoApp.tsx` (`startCall`).
2. Creates WebRTC peer connection using Google STUN (`stun:stun.l.google.com:19302`).
3. Acquires media stream via `navigator.mediaDevices.getUserMedia`.
4. Broadcasts `incoming_call` event and local SDP `call_offer` over Supabase Realtime channel `global_messages_listener`.
5. Callee device displays full-screen `incomingCall` modal with ringing tone (`SoundEffectsService.playRingtoneBurst()`).
6. When callee taps "Accept", callee creates local SDP `call_answer` and broadcasts it back.
7. ICE candidates are exchanged asynchronously (`ice_candidate` broadcast).
8. Once connected, state changes to `"accepted"` and media streams play through native HTML5 `<video>` / `<audio>` elements.

### C. Status (Stories) Flow
1. User posts a text, image, or video status via `AddStatusModal.tsx`.
2. Encoded media or rich gradient text is persisted to `public.statuses` with `expires_at = NOW() + INTERVAL '24 hours'`.
3. Read permissions are verified via PostgreSQL RLS function `can_view_status(status_id, user_id)`.
4. Grouped by author in `UpdatesHomeScreen.tsx` and viewed in `StatusViewerModal.tsx` with Instagram/WhatsApp style progress bars, viewer tracking, and replies.

---

## 4. Current Limitations & Technical Debt
1. **Media Storage in Database / Base64**: Image, audio, and video attachments currently persist as Base64 strings directly in `public.messages.content` and `public.statuses.media_url` rather than Supabase Storage buckets or S3/R2 objects.
2. **Single Component File Size**: `YoApp.tsx` is over 4,000 lines long, housing the orchestrator, `ChatsTab`, `CallsTab`, `PeopleTab`, `SettingsTab`, and `ChatView`.
3. **Realtime Broadcast as Fallback**: The app depends heavily on Supabase Realtime Broadcast alongside Postgres Changes to bridge unauthenticated or pending database transactions.
4. **Vite Bundle Size Warning**: The vendor chunk is ~858 kB minified (~240 kB gzipped); code splitting via `React.lazy()` is recommended for modal dialogues and status viewer screens.

---

## 5. Development & Testing Commands
```bash
# Start local dev server
npm run dev

# Run automated tests (Vitest)
npm test -- --run

# Run TypeScript compilation & production build
npm run build

# Sync assets to Android native shell
npx cap sync android
```
