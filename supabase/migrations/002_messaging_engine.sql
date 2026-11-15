-- ====================================================================
-- YO!!! SPRINT 1 MIGRATION: 002_messaging_engine.sql
-- Monotonic sequencing, idempotency, read cursor safety, receipt security
-- ====================================================================

-- 1. EXTEND CONVERSATIONS & CONVERSATION_MEMBERS
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS latest_sequence_number BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.conversation_members 
  ADD COLUMN IF NOT EXISTS last_read_sequence BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_muted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

-- 2. EXTEND MESSAGES WITH SEQUENCING & IDEMPOTENCY
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS sequence_number BIGINT,
  ADD COLUMN IF NOT EXISTS client_message_id TEXT,
  ADD COLUMN IF NOT EXISTS deleted_for_everyone BOOLEAN NOT NULL DEFAULT false;

-- 3. SAFE BACKFILL FOR EXISTING MESSAGES & CONVERSATIONS
-- Allocate sequential numbers (1, 2, 3...) per conversation for existing messages
WITH ranked AS (
  SELECT 
    id, 
    conversation_id, 
    ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at ASC) as seq
  FROM public.messages
  WHERE sequence_number IS NULL
)
UPDATE public.messages m
SET sequence_number = ranked.seq
FROM ranked
WHERE m.id = ranked.id;

-- Default any un-sequenced row to 1
UPDATE public.messages SET sequence_number = 1 WHERE sequence_number IS NULL;

-- Enforce NOT NULL on sequence_number
ALTER TABLE public.messages ALTER COLUMN sequence_number SET NOT NULL;

-- Update conversation latest sequence number
UPDATE public.conversations c
SET latest_sequence_number = COALESCE((
  SELECT MAX(sequence_number) FROM public.messages m WHERE m.conversation_id = c.id
), 0);

-- Backfill conversation_members.last_read_sequence based on existing last_read_at
UPDATE public.conversation_members cm
SET last_read_sequence = COALESCE((
  SELECT MAX(sequence_number) 
  FROM public.messages m 
  WHERE m.conversation_id = cm.conversation_id 
    AND cm.last_read_at IS NOT NULL 
    AND m.created_at <= cm.last_read_at
), 0);

-- 4. CONSTRAINTS & PERFORMANCE INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS messages_conv_seq_idx 
  ON public.messages(conversation_id, sequence_number);

CREATE UNIQUE INDEX IF NOT EXISTS messages_sender_client_id_idx 
  ON public.messages(sender_id, client_message_id) 
  WHERE client_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS messages_conv_seq_fetch_idx 
  ON public.messages(conversation_id, sequence_number DESC);

CREATE INDEX IF NOT EXISTS message_receipts_msg_user_idx 
  ON public.message_receipts(message_id, user_id);

-- ====================================================================
-- 5. TRANSACTIONAL RPC: ATOMIC IDEMPOTENT MESSAGE SENDER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.send_message(
  p_client_message_id TEXT,
  p_conversation_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_reply_to UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_user_id UUID;
  v_existing_msg RECORD;
  v_next_seq BIGINT;
  v_new_msg RECORD;
  v_preview TEXT;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required';
  END IF;

  -- 1. Verify caller is a member of this conversation
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not a member of this conversation';
  END IF;

  -- 2. Validate content & message type
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: Message content cannot be empty';
  END IF;

  IF p_message_type NOT IN ('text', 'image', 'video', 'audio', 'file', 'system') THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: Invalid message type';
  END IF;

  -- 3. Idempotency Check: if client_message_id already exists for this sender,
  -- return the original message without allocating a new sequence number.
  IF p_client_message_id IS NOT NULL THEN
    SELECT * INTO v_existing_msg 
    FROM public.messages 
    WHERE sender_id = v_current_user_id AND client_message_id = p_client_message_id;

    IF v_existing_msg.id IS NOT NULL THEN
      RETURN to_jsonb(v_existing_msg);
    END IF;
  END IF;

  -- 4. Lock conversation row to atomically allocate sequence number
  SELECT (latest_sequence_number + 1) INTO v_next_seq
  FROM public.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF v_next_seq IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: Conversation does not exist';
  END IF;

  -- 5. Insert new message record
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    sequence_number,
    client_message_id,
    content,
    message_type,
    reply_to,
    created_at
  ) VALUES (
    p_conversation_id,
    v_current_user_id,
    v_next_seq,
    p_client_message_id,
    p_content,
    p_message_type,
    p_reply_to,
    now()
  )
  RETURNING * INTO v_new_msg;

  -- 6. Update conversation latest sequence number and preview
  v_preview := CASE 
    WHEN p_message_type = 'text' THEN SUBSTRING(p_content, 1, 80)
    ELSE '[' || UPPER(p_message_type) || ']'
  END;

  UPDATE public.conversations
  SET 
    latest_sequence_number = v_next_seq,
    last_message_preview = v_preview,
    last_message_at = v_new_msg.created_at,
    updated_at = v_new_msg.created_at
  WHERE id = p_conversation_id;

  -- 7. Advance sender's own read cursor monotonically to this sequence
  UPDATE public.conversation_members
  SET 
    last_read_sequence = GREATEST(last_read_sequence, v_next_seq),
    last_read_at = v_new_msg.created_at
  WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id;

  RETURN to_jsonb(v_new_msg);
END;
$$;

-- ====================================================================
-- 6. TRANSACTIONAL RPC: VALIDATED DELIVERY ACKNOWLEDGEMENT
-- ====================================================================
CREATE OR REPLACE FUNCTION public.acknowledge_delivery(
  p_conversation_id UUID,
  p_message_ids UUID[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_user_id UUID;
  v_updated_count INT := 0;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required';
  END IF;

  -- Verify membership
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not a member of this conversation';
  END IF;

  -- Upsert delivery receipts ONLY for messages where current user is NOT the sender
  INSERT INTO public.message_receipts (message_id, user_id, delivered_at)
  SELECT m.id, v_current_user_id, now()
  FROM public.messages m
  WHERE m.id = ANY(p_message_ids)
    AND m.conversation_id = p_conversation_id
    AND m.sender_id <> v_current_user_id
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET delivered_at = COALESCE(public.message_receipts.delivered_at, EXCLUDED.delivered_at);

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count;
END;
$$;

-- ====================================================================
-- 7. TRANSACTIONAL RPC: MONOTONIC READ CURSOR ACKNOWLEDGEMENT
-- ====================================================================
CREATE OR REPLACE FUNCTION public.acknowledge_conversation_read(
  p_conversation_id UUID,
  p_max_sequence BIGINT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_current_user_id UUID;
  v_conv_latest_seq BIGINT;
  v_target_seq BIGINT;
  v_old_seq BIGINT;
  v_new_seq BIGINT;
  v_affected_receipts INT := 0;
BEGIN
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED: Authentication required';
  END IF;

  -- Lock member row to prevent concurrent race conditions
  SELECT last_read_sequence INTO v_old_seq
  FROM public.conversation_members
  WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id
  FOR UPDATE;

  IF v_old_seq IS NULL THEN
    RAISE EXCEPTION 'FORBIDDEN: User is not a member of this conversation';
  END IF;

  -- Validate requested sequence against actual conversation ceiling
  SELECT latest_sequence_number INTO v_conv_latest_seq
  FROM public.conversations
  WHERE id = p_conversation_id;

  -- Cap sequence to latest valid sequence in conversation
  v_target_seq := LEAST(p_max_sequence, v_conv_latest_seq);

  -- Enforce monotonic cursor advancement: cursor never regresses backwards
  v_new_seq := GREATEST(v_old_seq, v_target_seq);

  UPDATE public.conversation_members
  SET 
    last_read_sequence = v_new_seq,
    last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = v_current_user_id;

  -- Atomically mark receipts as read (and delivered if missing) for all incoming messages up to v_new_seq
  INSERT INTO public.message_receipts (message_id, user_id, delivered_at, read_at)
  SELECT m.id, v_current_user_id, now(), now()
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id <> v_current_user_id
    AND m.sequence_number <= v_new_seq
    AND m.deleted_at IS NULL
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET 
    delivered_at = COALESCE(public.message_receipts.delivered_at, EXCLUDED.delivered_at),
    read_at = COALESCE(public.message_receipts.read_at, EXCLUDED.read_at);

  GET DIAGNOSTICS v_affected_receipts = ROW_COUNT;

  RETURN jsonb_build_object(
    'conversation_id', p_conversation_id,
    'user_id', v_current_user_id,
    'previous_sequence', v_old_seq,
    'current_sequence', v_new_seq,
    'receipts_updated', v_affected_receipts
  );
END;
$$;

-- ====================================================================
-- 8. DATABASE RPC: TRANSACTIONAL UNREAD COUNTS
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_conversation_unread_counts()
RETURNS TABLE (
  conversation_id UUID,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT 
    cm.conversation_id,
    COUNT(m.id)::BIGINT AS unread_count
  FROM public.conversation_members cm
  LEFT JOIN public.messages m 
    ON m.conversation_id = cm.conversation_id
   AND m.sender_id <> cm.user_id
   AND m.sequence_number > cm.last_read_sequence
   AND m.deleted_at IS NULL
  WHERE cm.user_id = (SELECT auth.uid())
  GROUP BY cm.conversation_id;
$$;

-- ====================================================================
-- 9. RLS RECTIFICATIONS: LEAST-PRIVILEGE ACCESS CONTROL
-- ====================================================================

-- Drop the old overly restrictive receipt policy
DROP POLICY IF EXISTS "Users read and manage receipts" ON public.message_receipts;

-- Senders and recipients who belong to the conversation can view receipts for its messages
CREATE POLICY "Conversation members view message receipts" ON public.message_receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_members cm ON cm.conversation_id = m.conversation_id
      WHERE m.id = public.message_receipts.message_id
        AND cm.user_id = (SELECT auth.uid())
    )
  );

-- Recipients can insert receipts for incoming messages (never their own)
CREATE POLICY "Recipients insert own receipts" ON public.message_receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = public.message_receipts.message_id
        AND m.sender_id <> (SELECT auth.uid())
    )
  );

-- Recipients can update their own receipts (delivered_at -> read_at)
CREATE POLICY "Recipients update own receipts" ON public.message_receipts
  FOR UPDATE TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = public.message_receipts.message_id
        AND m.sender_id <> (SELECT auth.uid())
    )
  )
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Messages UPDATE: senders can soft-delete or edit own messages
CREATE POLICY "Senders update own messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = (SELECT auth.uid()))
  WITH CHECK (sender_id = (SELECT auth.uid()));
