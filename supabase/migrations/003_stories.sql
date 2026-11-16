-- ====================================================================
-- YO!!! STORIES / STATUS UPDATES SCHEMA (24-Hour Ephemeral Stories)
-- Migration 003: Stories, Story Views & RLS Policies
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('text', 'image', 'video')),
  media_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  bg_gradient TEXT DEFAULT 'from-teal-600 to-cyan-800',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_stories_user_id ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON public.stories(expires_at);

-- STORY VIEWS TRACKER
CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_story_viewer UNIQUE (story_id, viewer_id)
);

CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON public.story_views(viewer_id);

-- ENABLE RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

-- Stories Policies
CREATE POLICY "Stories are viewable by all authenticated users if unexpired"
  ON public.stories FOR SELECT
  TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create their own stories"
  ON public.stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories"
  ON public.stories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Story Views Policies
CREATE POLICY "Users can view story views if they authored the story or were viewer"
  ON public.story_views FOR SELECT
  TO authenticated
  USING (
    viewer_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_views.story_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own view receipt"
  ON public.story_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);
