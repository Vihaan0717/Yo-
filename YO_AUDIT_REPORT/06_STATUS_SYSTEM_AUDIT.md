# 06 — Status / Stories System Audit

## 1. Status Architecture Overview

The YO!!! status system replicates modern WhatsApp and Instagram stories:
- **Duration & Expiration**: Updates persist for exactly 24 hours (`expires_at = NOW() + INTERVAL '24 hours'`).
- **Content Types**:
  - `text`: Custom text styled with 6 vibrant gradient backgrounds.
  - `image`: Photos compressed and rendered full-screen.
  - `video`: Up to 25MB video clips with a 10-second viewing duration.
- **Privacy Controls**: Governed by `user_status_preferences` table with three audience modes:
  - `contacts`: Shared with all mutual contacts.
  - `blacklist`: Shared with all contacts except excluded user IDs.
  - `whitelist`: Shared only with selected user IDs.

---

## 2. Component Implementation & Audit

| Component | File Path | Responsibilities | Status |
| :--- | :--- | :--- | :--- |
| `UpdatesHomeScreen` | `src/features/status/components/UpdatesHomeScreen.tsx` | Main Updates tab list: My Status, Recent updates, Viewed updates, Muted updates | Verified & Functional |
| `AddStatusModal` | `src/features/status/components/AddStatusModal.tsx` | Modal to create text, photo, or video updates | Verified & Functional |
| `StatusViewerModal` | `src/features/status/components/StatusViewerModal.tsx` | Story player with multi-segment timer bars, tap gestures, pause on hold | Verified & Functional |
| `StatusPrivacyModal`| `src/features/status/components/StatusPrivacyModal.tsx`| Audience selector dialog | Verified & Functional |
| `StatusService` | `src/features/status/services/StatusService.ts` | Data layer querying active statuses, tracking views, muting publishers | Verified & Functional |

---

## 3. Discovered Gaps & Upgrade Opportunities

1. **Inline Base64 Video / Photo Storage**:
   * *Observation*: Status media is stored as Base64 strings directly in `public.statuses.media_url`.
   * *Impact*: Loading the Updates tab with multiple status updates downloads megabytes of Base64 strings into browser memory, creating UI stutter.
   * *Remedy*: Upload status images and videos to a dedicated `status-media` bucket in Supabase Storage.

2. **Real-Time Push on Status Creation**:
   * *Observation*: When a contact uploads a new status, other devices see the update upon navigating to the Updates tab or refreshing, but no instant toast or notification is fired.
   * *Remedy*: Subscribe to `postgres_changes` on the `statuses` table to update the green ring badge dynamically.
