# 12 — Step-by-Step Upgrade Roadmap

Below is the structured, prioritized engineering roadmap for the next development sprints.

---

## Sprint 1: Bundle Optimization & Screen Modularization (Priority 1)
- [ ] Configure Vite chunk splitting in `vite.config.ts`:
  - Split `vendor-react` (`react`, `react-dom`, `motion`).
  - Split `vendor-supabase` (`@supabase/supabase-js`).
  - Split `vendor-capacitor` (`@capacitor/*`).
- [ ] Refactor `YoApp.tsx` by extracting `ChatsTab`, `CallsTab`, `PeopleTab`, `SettingsTab`, and `ChatView` into separate files under `src/screens/`.
- [ ] Remove unused `react-router-dom` from `package.json` to reduce bundle weight.

---

## Sprint 2: Cloud Storage Migration & Base64 Purge (Priority 1)
- [ ] Create Supabase Storage buckets: `chat-attachments`, `status-media`, `avatars`.
- [ ] Write storage RLS policies ensuring only conversation participants can read attachment objects.
- [ ] Implement `StorageService.uploadMedia(file, bucket)` to upload compressed binaries.
- [ ] Update `YoApp.tsx` and `AddStatusModal.tsx` to store URLs rather than Base64 strings.

---

## Sprint 3: Call History & TURN Relay Hardening (Priority 2)
- [ ] Connect `CallsTab` to `public.call_sessions`, rendering true incoming, outgoing, and missed call logs.
- [ ] Add STUN + TURN credentials into `WebRTCService.ts` for guaranteed symmetric NAT mobile call completion.
- [ ] Add call duration timer display to `CallOverlay.tsx`.

---

## Sprint 4: Performance Virtualization & Offline Queue (Priority 3)
- [ ] Integrate `@tanstack/react-virtual` in `ChatView` to render large conversations smoothly on low-end Android hardware.
- [ ] Persist `MessageOutboxService` queue to `IndexedDB` or Capacitor SQLite for offline message composition.
