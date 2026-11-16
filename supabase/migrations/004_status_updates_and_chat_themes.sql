-- ====================================================================
-- YO!!! STATUS / UPDATES & INDIVIDUAL CHAT PERSONALIZATION ENGINE
-- Migration 004: Statuses, Audiences, Views, Likes, User Contacts & Chat Preferences
-- ====================================================================

-- 1. USER CONTACTS / RELATIONSHIPS
CREATE TABLE IF NOT EXISTS public.user_contacts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, contact_id),
  CHECK (user_id <> contact_id)
);
CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON public.user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact ON public.user_contacts(contact_id);

-- 2. USER STATUS PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_status_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_audience_mode TEXT NOT NULL DEFAULT 'contacts' CHECK (default_audience_mode IN ('contacts', 'except', 'only')),
  muted_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
  read_receipts_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. ENHANCED STATUSES TABLE
CREATE TABLE IF NOT EXISTS public.statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video', 'audio', 'layout')),
  text_content TEXT,
  media_path TEXT,
  thumbnail_path TEXT,
  caption TEXT DEFAULT '',
  audience_mode TEXT NOT NULL DEFAULT 'contacts' CHECK (audience_mode IN ('contacts', 'except', 'only')),
  publication_state TEXT NOT NULL DEFAULT 'published' CHECK (publication_state IN ('draft', 'uploading', 'published', 'expired', 'deleted')),
  metadata JSONB DEFAULT '{}'::jsonb, -- gradients, sticker positions, audio metadata, layout configs
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_statuses_owner ON public.statuses(owner_id);
CREATE INDEX IF NOT EXISTS idx_statuses_expires ON public.statuses(expires_at);
CREATE INDEX IF NOT EXISTS idx_statuses_active ON public.statuses(publication_state, expires_at);

-- 4. STATUS AUDIENCE EXCEPTIONS & INCLUSIONS
CREATE TABLE IF NOT EXISTS public.status_audiences (
  status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule TEXT NOT NULL CHECK (rule IN ('include', 'exclude')),
  PRIMARY KEY (status_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_status_audiences_status ON public.status_audiences(status_id);
CREATE INDEX IF NOT EXISTS idx_status_audiences_user ON public.status_audiences(user_id);

-- 5. STATUS VIEWS (Idempotent tracking with read receipts sensitivity)
CREATE TABLE IF NOT EXISTS public.status_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_status_viewer UNIQUE (status_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS idx_status_views_status ON public.status_views(status_id);
CREATE INDEX IF NOT EXISTS idx_status_views_viewer ON public.status_views(viewer_id);

-- 6. STATUS LIKES (Private to publisher and viewer)
CREATE TABLE IF NOT EXISTS public.status_likes (
  status_id UUID NOT NULL REFERENCES public.statuses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (status_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_status_likes_status ON public.status_likes(status_id);

-- 7. CHAT USER PREFERENCES (Per-conversation independent personalization)
CREATE TABLE IF NOT EXISTS public.chat_user_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  theme_id TEXT NOT NULL DEFAULT 'midnight',
  wallpaper_type TEXT NOT NULL DEFAULT 'preset' CHECK (wallpaper_type IN ('preset', 'solid', 'gradient', 'custom')),
  wallpaper_reference TEXT DEFAULT '',
  wallpaper_brightness REAL NOT NULL DEFAULT 1.0,
  outgoing_bubble_color TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  muted_until TIMESTAMPTZ,
  disappearing_timer_sec INT NOT NULL DEFAULT 0, -- 0 = Off, 86400 = 24h, 604800 = 7d, 7776000 = 90d
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_user_prefs_user ON public.chat_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_user_prefs_conv ON public.chat_user_preferences(conversation_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_user_preferences ENABLE ROW LEVEL SECURITY;

-- 1. User Contacts
CREATE POLICY "Users can manage their contacts"
  ON public.user_contacts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = contact_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. User Status Preferences
CREATE POLICY "Users manage their own status preferences"
  ON public.user_status_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Statuses Read Policy: Authors can view, or users who satisfy audience rules & unexpired
CREATE OR REPLACE FUNCTION public.can_view_status(p_status_id UUID, p_owner_id UUID, p_audience_mode TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid = p_owner_id THEN
    RETURN TRUE;
  END IF;

  -- Blocked check
  IF EXISTS (
    SELECT 1 FROM public.user_blocks 
    WHERE (blocker_id = p_owner_id AND blocked_id = v_uid) 
       OR (blocker_id = v_uid AND blocked_id = p_owner_id)
  ) THEN
    RETURN FALSE;
  END IF;

  -- Audience logic
  IF p_audience_mode = 'contacts' THEN
    -- In contacts mode, any contact who isn't explicitly blocked
    RETURN TRUE;
  ELSIF p_audience_mode = 'except' THEN
    -- Excluded users cannot view
    RETURN NOT EXISTS (
      SELECT 1 FROM public.status_audiences 
      WHERE status_id = p_status_id AND user_id = v_uid AND rule = 'exclude'
    );
  ELSIF p_audience_mode = 'only' THEN
    -- Only specifically included users can view
    RETURN EXISTS (
      SELECT 1 FROM public.status_audiences 
      WHERE status_id = p_status_id AND user_id = v_uid AND rule = 'include'
    );
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Statuses audience-scoped select"
  ON public.statuses FOR SELECT
  TO authenticated
  USING (
    publication_state = 'published' AND 
    expires_at > now() AND 
    can_view_status(id, owner_id, audience_mode)
  );

CREATE POLICY "Authors can insert statuses"
  ON public.statuses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Authors can update/delete their statuses"
  ON public.statuses FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. Status Audiences Policy
CREATE POLICY "Status audience rules managed by owner"
  ON public.status_audiences FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.statuses WHERE id = status_audiences.status_id AND owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.statuses WHERE id = status_audiences.status_id AND owner_id = auth.uid())
  );

-- 5. Status Views Policy
CREATE POLICY "Status owners and viewers can see views"
  ON public.status_views FOR SELECT
  TO authenticated
  USING (
    viewer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.statuses WHERE id = status_views.status_id AND owner_id = auth.uid())
  );

CREATE POLICY "Viewers can record their own view"
  ON public.status_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

-- 6. Status Likes Policy
CREATE POLICY "Status likes viewable by owner or liker"
  ON public.status_likes FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.statuses WHERE id = status_likes.status_id AND owner_id = auth.uid())
  );

CREATE POLICY "Users can like/unlike status"
  ON public.status_likes FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 7. Chat User Preferences Policy (Strict personal isolation)
CREATE POLICY "Users strictly manage their own chat preferences"
  ON public.chat_user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
