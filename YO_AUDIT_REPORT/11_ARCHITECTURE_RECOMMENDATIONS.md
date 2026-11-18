# 11 — Architecture & Engineering Recommendations

## 1. Systems to Preserve (Keep As-Is)

1. **Native OS Audio & TTS Integration**:
   - The dual-mode architecture in `VoiceAssistantService.ts` (native Android `@capacitor-community/text-to-speech` with browser Web SpeechSynthesis fallback) is performant, reliable, and zero-cost. Keep this implementation intact.
2. **PostgreSQL Monotonic Sequence & Watermark Model**:
   - The sequential counter in `002_messaging_engine.sql` (`last_sequence_number`) is the gold standard for distributed messaging synchronization. Preserve this database architecture.
3. **Zero-Weight Web Audio Sound Effects**:
   - Synthesizing pleasant alert chimes directly in code (`SoundEffectsService.ts`) eliminates audio file download latency and network failures. Keep this engine.

---

## 2. Targeted Systems for Refactoring

1. **Modularize `YoApp.tsx`**:
   - Split `YoApp.tsx` into separate screen files:
     - `src/screens/chats/ChatsScreen.tsx`
     - `src/screens/chat-view/ChatView.tsx`
     - `src/screens/calls/CallsScreen.tsx`
     - `src/screens/people/PeopleScreen.tsx`
     - `src/screens/settings/SettingsScreen.tsx`
2. **Migrate Media from Base64 to Supabase Storage**:
   - Introduce `MediaUploadService.ts` to push compressed files to Supabase Storage buckets, saving only secure CDN links and blurhashes to the database.
3. **Turn Calls Tab into Live Call History**:
   - Replace static demo data in `CallsTab` with real queries against `public.call_sessions`.
4. **Virtualize Long Conversation Histories**:
   - Implement `@tanstack/react-virtual` for message lists exceeding 50 items.
