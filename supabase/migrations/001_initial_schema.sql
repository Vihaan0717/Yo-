-- ====================================================================
-- YO!!! FOUNDATIONAL DATABASE SCHEMA & MIGRATION SCRIPT
-- Sprint 1: Production-grade relational schema with RLS, helper triggers & RPCs
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  is_discoverable BOOLEAN NOT NULL DEFAULT true,
  status_status TEXT DEFAULT 'Hey there! I am using Yo!!!',
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,24}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (lower(username));
CREATE INDEX IF NOT EXISTS profiles_discoverable_idx ON public.profiles(is_discoverable);

-- Automatically create profile on Supabase auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Yo User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2. USER DEVICES
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  push_token TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_devices_user_idx ON public.user_devices(user_id);

-- 3. USER BLOCKS
CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

-- 4. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  title TEXT,
  avatar_url TEXT,
  pair_key TEXT UNIQUE, -- Canonical sorted userA:userB key for direct conversations to prevent duplicates
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CONVERSATION MEMBERS
CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS conversation_members_user_idx ON public.conversation_members(user_id);

-- 6. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'file', 'system')),
  content TEXT,
  reply_to UUID REFERENCES public.messages(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS messages_conv_created_idx ON public.messages(conversation_id, created_at DESC);

-- Trigger to update conversation's last_message preview & timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET 
    last_message_preview = CASE 
      WHEN NEW.message_type = 'text' THEN SUBSTRING(NEW.content, 1, 80)
      ELSE '[' || UPPER(NEW.message_type) || ']'
    END,
    last_message_at = NEW.created_at,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_created ON public.messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_conversation_last_message();

-- 7. MESSAGE RECEIPTS
CREATE TABLE IF NOT EXISTS public.message_receipts (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  PRIMARY KEY (message_id, user_id)
);

-- 8. CALL SESSIONS
CREATE TABLE IF NOT EXISTS public.call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id),
  initiator_id UUID NOT NULL REFERENCES auth.users(id),
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'missed', 'ended', 'failed')),
  started_at TIMESTAMPTZ DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

-- Security helper: check if requesting user is a member of conversation
CREATE OR REPLACE FUNCTION public.is_conversation_member(target_conversation UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members cm
    WHERE cm.conversation_id = target_conversation
      AND cm.user_id = (SELECT auth.uid())
  );
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read discoverable profiles, update own profile
CREATE POLICY "Read discoverable profiles" ON public.profiles FOR SELECT TO authenticated
  USING (is_discoverable OR id = (SELECT auth.uid()));

CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Devices
CREATE POLICY "Manage own devices" ON public.user_devices FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Conversations & Members
CREATE POLICY "Members view conversations" ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(id));

CREATE POLICY "Members view conversation members" ON public.conversation_members FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

-- Messages
CREATE POLICY "Members read messages" ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

CREATE POLICY "Members send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid()) 
    AND public.is_conversation_member(conversation_id)
  );

-- Receipts
CREATE POLICY "Users read and manage receipts" ON public.message_receipts FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Calls
CREATE POLICY "Conversation members can read call sessions" ON public.call_sessions FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id));

CREATE POLICY "Initiate calls" ON public.call_sessions FOR INSERT TO authenticated
  WITH CHECK (
    initiator_id = (SELECT auth.uid())
    AND public.is_conversation_member(conversation_id)
  );

CREATE POLICY "Update calls" ON public.call_sessions FOR UPDATE TO authenticated
  USING (public.is_conversation_member(conversation_id));

-- ====================================================================
-- RPC FUNCTION: Safe direct conversation creation
-- ====================================================================
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  sorted_key TEXT;
  conv_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot start conversation with yourself';
  END IF;

  -- Build canonical key
  IF current_user_id < target_user_id THEN
    sorted_key := current_user_id::text || ':' || target_user_id::text;
  ELSE
    sorted_key := target_user_id::text || ':' || current_user_id::text;
  END IF;

  -- Check if already exists
  SELECT id INTO conv_id FROM public.conversations WHERE pair_key = sorted_key;
  
  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (type, pair_key, created_by)
    VALUES ('direct', sorted_key, current_user_id)
    RETURNING id INTO conv_id;

    -- Add both participants
    INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES 
      (conv_id, current_user_id, 'member'),
      (conv_id, target_user_id, 'member');
  END IF;

  RETURN conv_id;
END;
$$;

