# 07 — Media and Storage Audit

## 1. Current Storage Architecture

The application currently operates with an **in-database Base64 storage architecture**:
- **Images**: Downscaled on the client via HTML5 Canvas in [ImageService.ts](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/services/media/ImageService.ts) to a maximum dimension of 1280px with 78% JPEG quality, producing a Data URL (`data:image/jpeg;base64,...`).
- **Voice Notes**: Recorded in AAC/WebM via MediaRecorder in [VoiceRecorderService.ts](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/services/voice/VoiceRecorderService.ts) and converted to Base64.
- **Videos**: Read via `FileReader.readAsDataURL` with a 25MB client-side size check.
- **Documents**: Read via `FileReader.readAsDataURL` with a 15MB client-side size check.
- **Database Destination**: The raw Base64 string is written directly into `public.messages.content` and `public.statuses.media_url`.

---

## 2. Technical Evaluation of Current Architecture

| Evaluation Dimension | Assessment | Evidence & Technical Impact |
| :--- | :--- | :--- |
| **Simplicity** | High | Zero cloud bucket configuration or presigned URL exchanges required |
| **Scalability** | **Extremely Low** | Storing 1-5MB Base64 text per message severely bloats PostgreSQL heap pages and table indices |
| **Network Efficiency** | Low | Base64 increases raw file payload size by ~33% over the wire |
| **Memory Footprint** | Critical | Decoding large Base64 strings directly in React components strains low-end mobile RAM |

---

## 3. Recommended Future Storage Architecture (Supabase Storage / Cloudflare R2)

1. **Bucket Provisioning**:
   - `chat-media-images` (Private, authenticated signed URLs)
   - `chat-media-videos` (Private, chunked streaming)
   - `chat-media-audio` (Private, WebM/AAC)
   - `chat-media-docs` (Private, secure download)
   - `status-media` (Public or signed with 24h expiration)
   - `avatars` (Public CDN cached)
2. **Upload Pipeline**:
   - Client compresses image/audio locally.
   - Client uploads directly to Supabase Storage:
     `supabase.storage.from('chat-media-images').upload(`${convId}/${clientMsgId}.jpg`, blob)`
   - Database message record stores only the object path or CDN URL and a 16-character blurhash.
3. **Backup vs. Live Storage Separation**:
   - Live media stored in Supabase Storage or Cloudflare R2.
   - User chat backups (JSON export + media bundle) can be archived to Google Drive via OAuth without burdening active database storage.
