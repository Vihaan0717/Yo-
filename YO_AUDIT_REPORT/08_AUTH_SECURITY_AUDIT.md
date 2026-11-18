# 08 — Authentication & Security Audit

## 1. Authentication Mechanics & RLS Enforcement

- **Auth Provider**: Supabase Auth (GoTrue) handling JWT issuance, session refresh, and password encryption (bcrypt).
- **Session Persistence**: Sessions are saved in client localStorage under key `sb-<ref>-auth-token`.
- **Row Level Security (RLS)**:
  - Enabled on all core tables: `profiles`, `conversations`, `conversation_members`, `messages`, `message_receipts`, `statuses`, `status_views`, `status_likes`.
  - Security Helper Function:
    ```sql
    CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id uuid)
    RETURNS boolean AS $$
      SELECT EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conv_id AND user_id = auth.uid()
      );
    $$ LANGUAGE sql SECURITY DEFINER STABLE;
    ```

---

## 2. Threat Analysis & Vulnerability Matrix

| Threat Category | Finding | Severity | Analysis & Mitigation |
| :--- | :--- | :--- | :--- |
| **Direct Message IDOR** | `send_message` RPC verifies membership | Low / Safe | Verified: Users cannot send messages to conversations they do not belong to. |
| **Profile Impersonation** | Username uniqueness constraint | Low / Safe | Verified: Unique index on `LOWER(username)` prevents duplicate handles. |
| **Outbox Insert Bypass** | Fallback direct insert | Medium | If `send_message` fails, fallback insert runs. RLS restricts sender ID to `auth.uid()`, but bypasses sequence generation. Recommend disabling raw insert. |
| **Service Role Leakage** | Verified clean | Low / Safe | No service role secret is present in client bundles or public repositories. |
| **Rate Limiting** | Missing on client calls | Medium | Supabase Auth has built-in rate limits, but database messaging RPCs currently lack transaction-per-minute quotas. |

---

## 3. Data Privacy & Leakage Guards
- Private user emails from `auth.users` are **never** exposed in `public.profiles`. The profile schema exposes only `display_name`, `username`, `avatar_url`, and `bio`.
- Discovered users in the People tab are filtered to exclude the current user's profile.
