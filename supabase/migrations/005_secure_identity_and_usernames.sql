-- ====================================================================
-- YO!!! SECURE ACCOUNT IDENTITY, EMAIL VERIFICATION & USERNAME SYSTEM
-- Migration 005: Atomic Username Claiming, Reserved Handles, Normalized Uniqueness & Cooldown
-- ====================================================================

-- 1. RESERVED USERNAMES TABLE
CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  username TEXT PRIMARY KEY,
  reason TEXT NOT NULL DEFAULT 'Reserved by system',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed core reserved namespaces
INSERT INTO public.reserved_usernames (username, reason) VALUES
  ('admin', 'Reserved system administrator handle'),
  ('administrator', 'Reserved system administrator handle'),
  ('support', 'Official support channel'),
  ('help', 'Official help channel'),
  ('official', 'Reserved verification handle'),
  ('security', 'Official security team'),
  ('system', 'System notification handle'),
  ('root', 'Reserved administrative handle'),
  ('yo', 'Reserved application brand handle'),
  ('yoapp', 'Reserved application brand handle'),
  ('staff', 'Official staff handle'),
  ('team', 'Official team handle'),
  ('billing', 'Official billing handle'),
  ('moderator', 'Official moderator handle'),
  ('bot', 'Reserved bot namespace'),
  ('null', 'Reserved keyword'),
  ('undefined', 'Reserved keyword'),
  ('api', 'Reserved API namespace')
ON CONFLICT (username) DO NOTHING;

-- 2. USERNAME CHANGES AUDIT & COOLDOWN LOG
CREATE TABLE IF NOT EXISTS public.username_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_username TEXT NOT NULL,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_username_changes_user ON public.username_changes(user_id, changed_at DESC);

-- Enable RLS on audit tables
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.username_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read reserved usernames"
  ON public.reserved_usernames FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users read their own username change history"
  ON public.username_changes FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3. UPGRADE PROFILES TABLE CONSTRAINTS & COLUMNS
-- Ensure username_updated_at column exists
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS username_updated_at TIMESTAMPTZ DEFAULT now();

-- Drop old check constraint if exists
ALTER TABLE public.profiles 
  DROP CONSTRAINT IF EXISTS username_format;

-- Add updated strict constraint:
-- 3-24 characters, starts with a letter, letters/numbers/underscore/period, cannot end in dot, no consecutive dots
ALTER TABLE public.profiles 
  ADD CONSTRAINT username_strict_format CHECK (
    username ~ '^[a-zA-Z][a-zA-Z0-9_.]{1,22}[a-zA-Z0-9_]$'
    AND username NOT LIKE '%.%' OR username NOT LIKE '%..%'
  );

-- Function to validate username format & reserved words
CREATE OR REPLACE FUNCTION public.validate_username(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_username IS NULL THEN
    RETURN FALSE;
  END IF;

  v_clean := lower(trim(p_username));

  -- Length check
  IF length(v_clean) < 3 OR length(v_clean) > 24 THEN
    RETURN FALSE;
  END IF;

  -- Regex format: starts with letter, allows letters/digits/_/., cannot end with ., no consecutive ..
  IF NOT (v_clean ~ '^[a-z][a-z0-9_.]{1,22}[a-z0-9_]$') THEN
    RETURN FALSE;
  END IF;

  IF v_clean LIKE '%..%' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- 4. RPC: CHECK USERNAME AVAILABILITY (SAFE & NON-ENUMERATIVE)
CREATE OR REPLACE FUNCTION public.check_username_availability(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_taken BOOLEAN;
  v_reserved BOOLEAN;
  v_current_user_id UUID;
BEGIN
  v_clean := lower(trim(p_username));
  v_current_user_id := auth.uid();

  -- 1. Format check
  IF NOT public.validate_username(v_clean) THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Username must be 3-24 chars, start with a letter, end with letter/digit/_, and contain no consecutive dots.'
    );
  END IF;

  -- 2. Reserved check
  SELECT EXISTS (
    SELECT 1 FROM public.reserved_usernames WHERE username = v_clean
  ) INTO v_reserved;

  IF v_reserved THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'This username is reserved by Yo!!!'
    );
  END IF;

  -- 3. Taken check (excluding current user's own existing handle)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(username) = v_clean 
      AND (v_current_user_id IS NULL OR id != v_current_user_id)
  ) INTO v_taken;

  IF v_taken THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'This username is already taken.'
    );
  END IF;

  RETURN jsonb_build_object(
    'available', true,
    'normalized', v_clean
  );
END;
$$;

-- 5. RPC: ATOMIC USERNAME CLAIMING & PROFILE CREATION
CREATE OR REPLACE FUNCTION public.claim_username(
  p_username TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_clean TEXT;
  v_existing_username TEXT;
  v_last_updated TIMESTAMPTZ;
  v_cooldown_interval INTERVAL := INTERVAL '30 days';
  v_is_reserved BOOLEAN;
  v_is_taken BOOLEAN;
BEGIN
  -- 1. Authentication check
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_clean := lower(trim(p_username));

  -- 2. Validate format
  IF NOT public.validate_username(v_clean) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid username format. Must be 3-24 characters, start with a letter, and contain only letters, numbers, underscores, and single dots.'
    );
  END IF;

  -- 3. Check reserved list
  SELECT EXISTS (
    SELECT 1 FROM public.reserved_usernames WHERE username = v_clean
  ) INTO v_is_reserved;

  IF v_is_reserved THEN
    RETURN jsonb_build_object('success', false, 'error', 'This username is reserved by Yo!!!');
  END IF;

  -- 4. Check if current user already has a profile & inspect cooldown
  SELECT username, username_updated_at 
  INTO v_existing_username, v_last_updated
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE; -- Row-level lock to prevent race condition

  IF v_existing_username IS NOT NULL THEN
    -- If already has this exact username, allow updating display_name / avatar_url
    IF lower(v_existing_username) = v_clean THEN
      UPDATE public.profiles
      SET 
        display_name = COALESCE(p_display_name, display_name),
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = now()
      WHERE id = v_user_id;

      RETURN jsonb_build_object('success', true, 'username', v_clean);
    END IF;

    -- Cooldown check (30 days between username modifications)
    IF v_last_updated IS NOT NULL AND (now() - v_last_updated) < v_cooldown_interval THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Usernames can only be changed once every 30 days. Next change allowed on ' || to_char(v_last_updated + v_cooldown_interval, 'YYYY-MM-DD')
      );
    END IF;
  END IF;

  -- 5. Check if taken by another user (with row lock on conflicting record if present)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(username) = v_clean AND id != v_user_id
  ) INTO v_is_taken;

  IF v_is_taken THEN
    RETURN jsonb_build_object('success', false, 'error', 'This username is already taken by another account.');
  END IF;

  -- 6. Upsert profile atomically
  INSERT INTO public.profiles (
    id, 
    username, 
    display_name, 
    avatar_url, 
    username_updated_at,
    updated_at
  )
  VALUES (
    v_user_id,
    p_username, -- Stores user-chosen casing
    COALESCE(p_display_name, 'Yo User'),
    COALESCE(p_avatar_url, ''),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = COALESCE(p_display_name, public.profiles.display_name),
    avatar_url = COALESCE(p_avatar_url, public.profiles.avatar_url),
    username_updated_at = now(),
    updated_at = now();

  -- 7. Record audit log if this was a change from an existing username
  IF v_existing_username IS NOT NULL AND lower(v_existing_username) != v_clean THEN
    INSERT INTO public.username_changes (user_id, old_username, new_username)
    VALUES (v_user_id, v_existing_username, p_username);
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'username', p_username, 
    'user_id', v_user_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'This username was just claimed by another user.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
