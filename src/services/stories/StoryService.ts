/**
 * StoryService.ts
 * Manages 24-hour ephemeral stories / status updates:
 * - Posting text, photo, and video stories
 * - Fetching active stories with 24-hour expiration filter
 * - Recording story views & fetching viewer list for story authors
 * - LocalStorage fallback for instant offline/guest operation
 */

import { supabase } from '../supabase/client';
import type { Profile } from '../../types';

export type StoryMediaType = 'text' | 'image' | 'video';

export interface StoryItem {
  id: string;
  user_id: string;
  media_type: StoryMediaType;
  media_url: string;
  caption?: string;
  bg_gradient?: string;
  created_at: string;
  expires_at: string;
  views_count?: number;
  has_viewed?: boolean;
}

export interface UserStoryGroup {
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  stories: StoryItem[];
  allViewed: boolean;
  latestTimestamp: string;
}

export interface StoryViewer {
  id: string;
  viewer_id: string;
  viewed_at: string;
  profile?: Profile;
}

const LOCAL_STORIES_KEY = 'yo_local_ephemeral_stories';
const LOCAL_VIEWS_KEY = 'yo_local_story_views';

export class StoryService {
  /**
   * Post a new 24h story
   */
  static async createStory({
    userId,
    userProfile,
    mediaType,
    mediaUrl,
    caption,
    bgGradient
  }: {
    userId: string;
    userProfile?: { display_name: string; username: string; avatar_url?: string };
    mediaType: StoryMediaType;
    mediaUrl: string;
    caption?: string;
    bgGradient?: string;
  }): Promise<StoryItem> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();
    const tempId = `story_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newStory: StoryItem = {
      id: tempId,
      user_id: userId,
      media_type: mediaType,
      media_url: mediaUrl,
      caption: caption || '',
      bg_gradient: bgGradient || 'from-teal-600 to-cyan-800',
      created_at: createdAt,
      expires_at: expiresAt,
      views_count: 0,
      has_viewed: false
    };

    // 1. Save locally for instantaneous zero-latency UX
    this.saveLocalStory(newStory, userProfile);

    // 2. Persist to Supabase if authenticated
    try {
      const { data, error } = await supabase
        .from('stories')
        .insert({
          user_id: userId,
          media_type: mediaType,
          media_url: mediaUrl,
          caption: caption || '',
          bg_gradient: bgGradient || 'from-teal-600 to-cyan-800',
          created_at: createdAt,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (!error && data) {
        newStory.id = data.id;
        this.saveLocalStory(newStory, userProfile);
      }
    } catch (e) {
      console.warn('Supabase story insert fallback:', e);
    }

    return newStory;
  }

  /**
   * Fetch all active unexpired stories grouped by user
   */
  static async getActiveStories(currentUserId?: string): Promise<UserStoryGroup[]> {
    const groups: Map<string, UserStoryGroup> = new Map();

    // 1. Fetch from Supabase
    try {
      const nowIso = new Date().toISOString();
      const { data: dbStories, error } = await supabase
        .from('stories')
        .select('*, profiles:user_id(id, display_name, username, avatar_url)')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true });

      if (!error && dbStories && dbStories.length > 0) {
        for (const s of dbStories) {
          const author = (s as any).profiles || {
            id: s.user_id,
            display_name: 'Yo User',
            username: 'user'
          };

          const item: StoryItem = {
            id: s.id,
            user_id: s.user_id,
            media_type: s.media_type,
            media_url: s.media_url,
            caption: s.caption,
            bg_gradient: s.bg_gradient,
            created_at: s.created_at,
            expires_at: s.expires_at,
            has_viewed: this.hasViewedLocal(s.id, currentUserId)
          };

          if (!groups.has(s.user_id)) {
            groups.set(s.user_id, {
              user: author,
              stories: [],
              allViewed: true,
              latestTimestamp: s.created_at
            });
          }
          const group = groups.get(s.user_id)!;
          group.stories.push(item);
          if (!item.has_viewed && currentUserId && item.user_id !== currentUserId) {
            group.allViewed = false;
          }
          group.latestTimestamp = s.created_at;
        }
      }
    } catch (e) {
      console.warn('Error fetching DB stories:', e);
    }

    // 2. Merge local storage stories (for offline / instant guest testing)
    const local = this.getLocalStories();
    const now = Date.now();
    for (const ls of local) {
      if (new Date(ls.story.expires_at).getTime() < now) continue;

      if (!groups.has(ls.story.user_id)) {
        groups.set(ls.story.user_id, {
          user: ls.author,
          stories: [],
          allViewed: true,
          latestTimestamp: ls.story.created_at
        });
      }
      const group = groups.get(ls.story.user_id)!;
      if (!group.stories.some((s) => s.id === ls.story.id)) {
        group.stories.push({
          ...ls.story,
          has_viewed: this.hasViewedLocal(ls.story.id, currentUserId)
        });
        group.latestTimestamp = ls.story.created_at;
      }
    }

    // Sort groups: own stories first, then unviewed stories, then viewed stories
    const result = Array.from(groups.values());
    result.sort((a, b) => {
      if (a.user.id === currentUserId) return -1;
      if (b.user.id === currentUserId) return 1;
      if (!a.allViewed && b.allViewed) return -1;
      if (a.allViewed && !b.allViewed) return 1;
      return new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime();
    });

    return result;
  }

  /**
   * Mark story as viewed by current user
   */
  static async recordStoryView(storyId: string, viewerId: string) {
    if (!storyId || !viewerId) return;

    // Save locally
    const raw = localStorage.getItem(LOCAL_VIEWS_KEY);
    const set: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!set[storyId]) set[storyId] = [];
    if (!set[storyId].includes(viewerId)) {
      set[storyId].push(viewerId);
      localStorage.setItem(LOCAL_VIEWS_KEY, JSON.stringify(set));
    }

    // Record in Supabase
    try {
      if (!storyId.startsWith('story_')) {
        await supabase
          .from('story_views')
          .insert({ story_id: storyId, viewer_id: viewerId })
          .maybeSingle();
      }
    } catch {
      // Ignore duplicate key or network drop
    }
  }

  /**
   * Get viewers for a story authored by user
   */
  static async getStoryViewers(storyId: string): Promise<StoryViewer[]> {
    try {
      if (!storyId.startsWith('story_')) {
        const { data } = await supabase
          .from('story_views')
          .select('id, viewer_id, viewed_at, profiles:viewer_id(*)')
          .eq('story_id', storyId)
          .order('viewed_at', { ascending: false });

        if (data) {
          return data.map((d: any) => ({
            id: d.id,
            viewer_id: d.viewer_id,
            viewed_at: d.viewed_at,
            profile: d.profiles
          }));
        }
      }
    } catch {
      // fallback
    }

    // Local fallback
    const raw = localStorage.getItem(LOCAL_VIEWS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const viewerIds: string[] = map[storyId] || [];
    return viewerIds.map((vid) => ({
      id: `view_${vid}`,
      viewer_id: vid,
      viewed_at: new Date().toISOString()
    }));
  }

  // --- Helpers ---
  private static hasViewedLocal(storyId: string, userId?: string): boolean {
    if (!userId) return false;
    const raw = localStorage.getItem(LOCAL_VIEWS_KEY);
    if (!raw) return false;
    try {
      const map = JSON.parse(raw);
      return Boolean(map[storyId]?.includes(userId));
    } catch {
      return false;
    }
  }

  private static getLocalStories(): Array<{ story: StoryItem; author: any }> {
    const raw = localStorage.getItem(LOCAL_STORIES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveLocalStory(story: StoryItem, author?: any) {
    const list = this.getLocalStories();
    const existingIdx = list.findIndex((x) => x.story.id === story.id);
    const entry = {
      story,
      author: author || {
        id: story.user_id,
        display_name: 'You',
        username: 'me'
      }
    };
    if (existingIdx >= 0) {
      list[existingIdx] = entry;
    } else {
      list.push(entry);
    }
    localStorage.setItem(LOCAL_STORIES_KEY, JSON.stringify(list));
  }
}
