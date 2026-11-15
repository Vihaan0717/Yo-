-- ====================================================================
-- YO!!! SPRINT 1 ROLLBACK MIGRATION: 002_messaging_engine_down.sql
-- Safely reverts 002_messaging_engine.sql
-- ====================================================================

-- Revert RPCs
DROP FUNCTION IF EXISTS public.send_message(TEXT, UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.acknowledge_delivery(UUID, UUID[]);
DROP FUNCTION IF EXISTS public.acknowledge_conversation_read(UUID, BIGINT);
DROP FUNCTION IF EXISTS public.get_conversation_unread_counts();

-- Revert Policies
DROP POLICY IF EXISTS "Senders update own messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients update own receipts" ON public.message_receipts;
DROP POLICY IF EXISTS "Recipients insert own receipts" ON public.message_receipts;
DROP POLICY IF EXISTS "Conversation members view message receipts" ON public.message_receipts;

-- Re-establish original baseline receipt policy
CREATE POLICY "Users read and manage receipts" ON public.message_receipts 
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) 
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Revert Indexes & Columns
DROP INDEX IF EXISTS messages_conv_seq_idx;
DROP INDEX IF EXISTS messages_sender_client_id_idx;
DROP INDEX IF EXISTS messages_conv_seq_fetch_idx;
DROP INDEX IF EXISTS message_receipts_msg_user_idx;

ALTER TABLE public.messages DROP COLUMN IF EXISTS sequence_number;
ALTER TABLE public.messages DROP COLUMN IF EXISTS client_message_id;
ALTER TABLE public.messages DROP COLUMN IF EXISTS deleted_for_everyone;

ALTER TABLE public.conversation_members DROP COLUMN IF EXISTS last_read_sequence;
ALTER TABLE public.conversation_members DROP COLUMN IF EXISTS is_muted;
ALTER TABLE public.conversation_members DROP COLUMN IF EXISTS is_archived;
ALTER TABLE public.conversation_members DROP COLUMN IF EXISTS is_pinned;

ALTER TABLE public.conversations DROP COLUMN IF EXISTS latest_sequence_number;
