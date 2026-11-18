# 04 — Database Architecture & Schema Audit

## 1. Schema & Migration History

The database architecture is defined in 5 progressive migration files located in `supabase/migrations/`:
1. `001_initial_schema.sql`: Core schema defining identity, devices, blocks, conversations, members, messages, receipts, and calls.
2. `002_messaging_engine.sql`: High-performance messaging RPCs with sequential monotonic counter logic, idempotent delivery receipts, and unread watermark calculations.
3. `003_stories.sql`: Early stories table schema.
4. `004_status_updates_and_chat_themes.sql`: Enhanced 24h statuses, audience lists, likes, views, contacts, and chat preferences.
5. `005_secure_identity_and_usernames.sql`: Reserved names, username validation rules, and claim transactions.

---

## 2. Table-by-Table Architectural Specification

### Table: `public.profiles`
- **Columns**: `id (UUID PK FK auth.users)`, `username (TEXT UNIQUE)`, `display_name (TEXT)`, `avatar_url (TEXT)`, `bio (TEXT)`, `status_status (TEXT)`, `is_discoverable (BOOLEAN)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)`.
- **Indexes**: `idx_profiles_username_lower (LOWER(username))`.
- **RLS Policies**:
  - `Public profiles are viewable by everyone`: `SELECT FOR ALL USING (true)`.
  - `Users can insert their own profile`: `INSERT WITH CHECK (auth.uid() = id)`.
  - `Users can update own profile`: `UPDATE USING (auth.uid() = id)`.

### Table: `public.conversations`
- **Columns**: `id (UUID PK)`, `type (TEXT CHECK IN ('direct','group'))`, `title (TEXT)`, `avatar_url (TEXT)`, `created_by (UUID FK profiles.id)`, `created_at (TIMESTAMPTZ)`, `last_message_preview (TEXT)`, `last_message_at (TIMESTAMPTZ)`, `last_sequence_number (BIGINT DEFAULT 0)`.
- **RLS Policies**:
  - `Members can view their conversations`: `SELECT USING (EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = id AND user_id = auth.uid()))`.

### Table: `public.conversation_members`
- **Columns**: `id (UUID PK)`, `conversation_id (UUID FK conversations.id ON DELETE CASCADE)`, `user_id (UUID FK profiles.id ON DELETE CASCADE)`, `role (TEXT CHECK IN ('admin','member'))`, `last_read_at (TIMESTAMPTZ)`, `last_read_sequence_number (BIGINT DEFAULT 0)`, `joined_at (TIMESTAMPTZ)`.
- **Constraints**: `UNIQUE(conversation_id, user_id)`.
- **Indexes**: `idx_conversation_members_lookup (conversation_id, user_id)`.

### Table: `public.messages`
- **Columns**: `id (UUID PK)`, `client_message_id (TEXT UNIQUE)`, `conversation_id (UUID FK conversations.id ON DELETE CASCADE)`, `sender_id (UUID FK profiles.id)`, `sequence_number (BIGINT)`, `content (TEXT)`, `message_type (TEXT)`, `reply_to_id (UUID FK messages.id)`, `media_metadata (JSONB)`, `created_at (TIMESTAMPTZ)`, `edited_at (TIMESTAMPTZ)`, `deleted_at (TIMESTAMPTZ)`.
- **Indexes**: `idx_messages_conversation_seq (conversation_id, sequence_number DESC)`.

### Table: `public.message_receipts`
- **Columns**: `id (UUID PK)`, `message_id (UUID FK messages.id ON DELETE CASCADE)`, `user_id (UUID FK profiles.id ON DELETE CASCADE)`, `delivered_at (TIMESTAMPTZ)`, `read_at (TIMESTAMPTZ)`, `created_at (TIMESTAMPTZ)`.
- **Constraints**: `UNIQUE(message_id, user_id)`.
- **Indexes**: `idx_message_receipts_lookup (message_id, user_id)`.

### Table: `public.statuses`
- **Columns**: `id (UUID PK)`, `publisher_id (UUID FK profiles.id ON DELETE CASCADE)`, `content_type (TEXT CHECK IN ('text','image','video'))`, `text_content (TEXT)`, `media_url (TEXT)`, `background_gradient (TEXT)`, `caption (TEXT)`, `duration_seconds (INTEGER DEFAULT 5)`, `audience_mode (TEXT DEFAULT 'contacts')`, `expires_at (TIMESTAMPTZ)`, `created_at (TIMESTAMPTZ)`.
- **Indexes**: `idx_statuses_publisher_active (publisher_id, expires_at)`.

### Table: `public.status_views`
- **Columns**: `id (UUID PK)`, `status_id (UUID FK statuses.id ON DELETE CASCADE)`, `viewer_id (UUID FK profiles.id ON DELETE CASCADE)`, `viewed_at (TIMESTAMPTZ)`.
- **Constraints**: `UNIQUE(status_id, viewer_id)`.

### Table: `public.status_likes`
- **Columns**: `id (UUID PK)`, `status_id (UUID FK statuses.id ON DELETE CASCADE)`, `user_id (UUID FK profiles.id ON DELETE CASCADE)`, `created_at (TIMESTAMPTZ)`.
- **Constraints**: `UNIQUE(status_id, user_id)`.

### Table: `public.call_sessions`
- **Columns**: `id (UUID PK)`, `conversation_id (UUID FK conversations.id)`, `initiator_id (UUID FK profiles.id)`, `call_type (TEXT CHECK IN ('audio','video'))`, `status (TEXT CHECK IN ('ringing','accepted','rejected','missed','ended'))`, `started_at (TIMESTAMPTZ)`, `ended_at (TIMESTAMPTZ)`.

---

## 3. Database Functions & Stored Procedures (RPCs)

1. **`send_message(p_conversation_id, p_sender_id, p_content, p_client_message_id, p_message_type, p_reply_to_id)`**:
   - Atomic transaction.
   - Enforces `is_conversation_member` security check.
   - Idempotency guard: checks if `p_client_message_id` already exists.
   - Monotonically increments `conversations.last_sequence_number`.
   - Updates `last_message_preview` and `last_message_at`.
   - Inserts message row and returns populated record.
2. **`acknowledge_delivery(p_conversation_id, p_message_ids, p_user_id)`**:
   - Inserts or updates rows in `message_receipts` with `delivered_at = NOW()`.
   - Idempotent `ON CONFLICT (message_id, user_id) DO UPDATE SET delivered_at = COALESCE(...)`.
3. **`acknowledge_conversation_read(p_conversation_id, p_user_id, p_up_to_sequence_number)`**:
   - Updates `conversation_members.last_read_at = NOW()` and `last_read_sequence_number`.
   - Backfills `read_at = NOW()` across all past `message_receipts` up to the sequence number.
4. **`get_conversation_unread_counts(p_user_id)`**:
   - High-speed SQL query that counts incoming messages where `sequence_number > last_read_sequence_number`.
5. **`get_or_create_direct_conversation(target_user_id)`**:
   - Finds existing direct chat between `auth.uid()` and `target_user_id`, or creates the conversation row and both membership rows atomically.
6. **`claim_username(requested_username)`**:
   - Validates regex and reserved lists, and assigns the username to the authenticated caller's profile.

---

## 4. Database Architectural Analysis & Optimization Points

1. **N+1 Lookups on Conversation Refresh**:
   - In [YoApp.tsx lines 2973-3009](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/components/yo/YoApp.tsx#L2973-L3009), the client queries `conversation_members` and then serially loops to query `profiles` for each other participant.
   - *Fix*: Create a PostgreSQL View `user_conversations_view` or use Supabase foreign table joins:
     ```sql
     SELECT conversation_id, conversations(*), other_member:conversation_members(profiles(*))
     FROM conversation_members
     WHERE user_id = auth.uid();
     ```
2. **Base64 Payload Storage Overhead**:
   - Column `messages.content` is plain `TEXT`. Storing Base64 images directly inside the main `messages` table means sequential table scans and WAL logs become massive.
   - *Fix*: Store binary files in Supabase Storage buckets, placing only the CDN URL in `messages.content`.
