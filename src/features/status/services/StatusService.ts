/**
 * StatusService.ts
 * Client-side and Supabase orchestrator for Status creation, audience scoping,
 * real-time status feeds, idempotent views, private likes, and muting.
 */

import { supabase } from '../../../services/supabase/client';
import type { 
  StatusItem, 
  StatusContentType, 
  StatusAudienceMode, 
  UserStatusGroup, 
  StatusViewer,
  UserStatusPreferences
} from '../types/status';

const LOCAL_STATUSES_KEY = 'yo_local_statuses_store';
const LOCAL_VIEWS_KEY = 'yo_local_status_views_store';
const LOCAL_LIKES_KEY = 'yo_local_status_likes_store';
const LOCAL_PREFS_KEY = 'yo_local_status_prefs_store';

export class StatusService {
  /**
   * Get user's status preferences (default audience, muted users, read receipt toggle)
   */
  static async getPreferences(userId: string): Promise<UserStatusPreferences> {
    try {
      const { data } = await supabase
        .from('user_status_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        return {
          user_id: data.user_id,
          default_audience_mode: data.default_audience_mode || 'contacts',
          muted_user_ids: data.muted_user_ids || [],
          read_receipts_enabled: data.read_receipts_enabled ?? true
        };
      }
    } catch {
      // Local fallback
    }

    const raw = localStorage.getItem(LOCAL_PREFS_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch {}
    }

    return {
      user_id: userId,
      default_audience_mode: 'contacts',
      muted_user_ids: [],
      read_receipts_enabled: true
    };
  }

  /**
   * Save user's status preferences
   */
  static async savePreferences(userId: string, prefs: Partial<UserStatusPreferences>) {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...prefs };
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(updated));

    try {
      await supabase
        .from('user_status_preferences')
        .upsert({
          user_id: userId,
          default_audience_mode: updated.default_audience_mode,
          muted_user_ids: updated.muted_user_ids,
          read_receipts_enabled: updated.read_receipts_enabled,
          updated_at: new Date().toISOString()
        });
    } catch (e) {
      console.warn('Could not persist status preferences to Supabase:', e);
    }
  }

  /**
   * Publish a new status item with specific audience scoping
   */
  static async publishStatus({
    userId,
    userProfile,
    contentType,
    textContent,
    mediaPath,
    thumbnailPath,
    caption,
    audienceMode,
    audienceUserIds,
    metadata
  }: {
    userId: string;
    userProfile?: { display_name: string; username: string; avatar_url?: string };
    contentType: StatusContentType;
    textContent?: string;
    mediaPath?: string;
    thumbnailPath?: string;
    caption?: string;
    audienceMode: StatusAudienceMode;
    audienceUserIds?: string[];
    metadata?: any;
  }): Promise<StatusItem> {
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const tempId = `status_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const newItem: StatusItem = {
      id: tempId,
      owner_id: userId,
      content_type: contentType,
      text_content: textContent,
      media_path: mediaPath,
      thumbnail_path: thumbnailPath,
      caption: caption || '',
      audience_mode: audienceMode,
      publication_state: 'published',
      metadata: metadata || {},
      created_at: createdAt,
      expires_at: expiresAt,
      views_count: 0,
      likes_count: 0,
      has_viewed: false,
      has_liked: false
    };

    // 1. Instant local persistence for zero-delay feedback
    this.saveLocalStatus(newItem, userProfile);

    // 2. Persist to Supabase
    try {
      const { data, error } = await supabase
        .from('statuses')
        .insert({
          owner_id: userId,
          content_type: contentType,
          text_content: textContent,
          media_path: mediaPath,
          thumbnail_path: thumbnailPath,
          caption: caption || '',
          audience_mode: audienceMode,
          publication_state: 'published',
          metadata: metadata || {},
          created_at: createdAt,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (!error && data) {
        newItem.id = data.id;
        this.saveLocalStatus(newItem, userProfile);

        // Insert audience rules if except or only
        if ((audienceMode === 'except' || audienceMode === 'only') && audienceUserIds && audienceUserIds.length > 0) {
          const rule = audienceMode === 'except' ? 'exclude' : 'include';
          const rows = audienceUserIds.map((targetUid) => ({
            status_id: data.id,
            user_id: targetUid,
            rule
          }));
          await supabase.from('status_audiences').insert(rows);
        }
      }
    } catch (e) {
      console.warn('Status Supabase publish fallback:', e);
    }

    return newItem;
  }

  /**
   * Get all active statuses grouped by contact, categorized by Recent, Viewed, and Muted
   */
  static async getActiveStatusGroups(currentUserId?: string): Promise<{
    ownGroup?: UserStatusGroup;
    recentGroups: UserStatusGroup[];
    viewedGroups: UserStatusGroup[];
    mutedGroups: UserStatusGroup[];
    allGroups: UserStatusGroup[];
  }> {
    const groupsMap: Map<string, UserStatusGroup> = new Map();
    const prefs = currentUserId ? await this.getPreferences(currentUserId) : null;
    const mutedSet = new Set(prefs?.muted_user_ids || []);

    // 1. Fetch from Supabase
    try {
      const nowIso = new Date().toISOString();
      const { data: dbStatuses, error } = await supabase
        .from('statuses')
        .select('*, profiles:owner_id(id, display_name, username, avatar_url)')
        .eq('publication_state', 'published')
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: true });

      if (!error && dbStatuses && dbStatuses.length > 0) {
        for (const s of dbStatuses) {
          const author = (s as any).profiles || {
            id: s.owner_id,
            display_name: 'Yo Contact',
            username: 'user'
          };

          const isMuted = mutedSet.has(s.owner_id);
          const hasViewed = this.hasViewedLocal(s.id, currentUserId);
          const hasLiked = this.hasLikedLocal(s.id, currentUserId);

          const item: StatusItem = {
            id: s.id,
            owner_id: s.owner_id,
            content_type: s.content_type,
            text_content: s.text_content,
            media_path: s.media_path,
            thumbnail_path: s.thumbnail_path,
            caption: s.caption,
            audience_mode: s.audience_mode,
            publication_state: s.publication_state,
            metadata: s.metadata,
            created_at: s.created_at,
            expires_at: s.expires_at,
            has_viewed: hasViewed,
            has_liked: hasLiked
          };

          if (!groupsMap.has(s.owner_id)) {
            groupsMap.set(s.owner_id, {
              user: author,
              statuses: [],
              allViewed: true,
              isMuted,
              latestTimestamp: s.created_at
            });
          }
          const group = groupsMap.get(s.owner_id)!;
          group.statuses.push(item);
          if (!item.has_viewed && currentUserId && item.owner_id !== currentUserId) {
            group.allViewed = false;
          }
          group.latestTimestamp = s.created_at;
        }
      }
    } catch (e) {
      console.warn('DB Status fetch error:', e);
    }

    // 2. Merge local storage statuses
    const local = this.getLocalStatuses();
    const now = Date.now();
    for (const ls of local) {
      if (new Date(ls.status.expires_at).getTime() < now) continue;

      const isMuted = mutedSet.has(ls.status.owner_id);
      const hasViewed = this.hasViewedLocal(ls.status.id, currentUserId);
      const hasLiked = this.hasLikedLocal(ls.status.id, currentUserId);

      if (!groupsMap.has(ls.status.owner_id)) {
        groupsMap.set(ls.status.owner_id, {
          user: ls.author,
          statuses: [],
          allViewed: true,
          isMuted,
          latestTimestamp: ls.status.created_at
        });
      }
      const group = groupsMap.get(ls.status.owner_id)!;
      if (!group.statuses.some((s) => s.id === ls.status.id)) {
        group.statuses.push({
          ...ls.status,
          has_viewed: hasViewed,
          has_liked: hasLiked
        });
        if (!hasViewed && currentUserId && ls.status.owner_id !== currentUserId) {
          group.allViewed = false;
        }
        group.latestTimestamp = ls.status.created_at;
      }
    }

    const allGroups = Array.from(groupsMap.values());
    const ownGroup = allGroups.find((g) => g.user.id === currentUserId);
    const otherGroups = allGroups.filter((g) => g.user.id !== currentUserId);

    const mutedGroups = otherGroups.filter((g) => g.isMuted);
    const nonMutedGroups = otherGroups.filter((g) => !g.isMuted);

    const recentGroups = nonMutedGroups.filter((g) => !g.allViewed);
    const viewedGroups = nonMutedGroups.filter((g) => g.allViewed);

    // Sort recent updates by newest first
    recentGroups.sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
    viewedGroups.sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());
    mutedGroups.sort((a, b) => new Date(b.latestTimestamp).getTime() - new Date(a.latestTimestamp).getTime());

    return {
      ownGroup,
      recentGroups,
      viewedGroups,
      mutedGroups,
      allGroups: [
        ...(ownGroup ? [ownGroup] : []),
        ...recentGroups,
        ...viewedGroups,
        ...mutedGroups
      ]
    };
  }

  /**
   * Record a viewed status (idempotent)
   */
  static async recordStatusView(statusId: string, viewerId: string) {
    if (!statusId || !viewerId) return;

    // Save locally
    const raw = localStorage.getItem(LOCAL_VIEWS_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[statusId]) map[statusId] = [];
    if (!map[statusId].includes(viewerId)) {
      map[statusId].push(viewerId);
      localStorage.setItem(LOCAL_VIEWS_KEY, JSON.stringify(map));
    }

    // Persist to Supabase if UUID
    try {
      if (!statusId.startsWith('status_')) {
        await supabase
          .from('status_views')
          .insert({ status_id: statusId, viewer_id: viewerId })
          .maybeSingle();
      }
    } catch {}
  }

  /**
   * Toggle private like on a status item
   */
  static async toggleStatusLike(statusId: string, userId: string): Promise<boolean> {
    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
    if (!map[statusId]) map[statusId] = [];

    const isLiked = map[statusId].includes(userId);
    let nextLiked = false;

    if (isLiked) {
      map[statusId] = map[statusId].filter((id) => id !== userId);
      nextLiked = false;
    } else {
      map[statusId].push(userId);
      nextLiked = true;
    }
    localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(map));

    // Persist to Supabase
    try {
      if (!statusId.startsWith('status_')) {
        if (nextLiked) {
          await supabase.from('status_likes').insert({ status_id: statusId, user_id: userId });
        } else {
          await supabase.from('status_likes').delete().match({ status_id: statusId, user_id: userId });
        }
      }
    } catch {}

    return nextLiked;
  }

  /**
   * Get detailed viewer list for author (shows viewers + like status)
   */
  static async getStatusViewers(statusId: string): Promise<StatusViewer[]> {
    try {
      if (!statusId.startsWith('status_')) {
        const { data } = await supabase
          .from('status_views')
          .select('id, viewer_id, viewed_at, profiles:viewer_id(id, display_name, username, avatar_url)')
          .eq('status_id', statusId)
          .order('viewed_at', { ascending: false });

        const { data: likes } = await supabase
          .from('status_likes')
          .select('user_id')
          .eq('status_id', statusId);

        const likedUserIds = new Set((likes || []).map((l: any) => l.user_id));

        if (data) {
          return data.map((d: any) => ({
            id: d.id,
            viewer_id: d.viewer_id,
            viewed_at: d.viewed_at,
            has_liked: likedUserIds.has(d.viewer_id),
            profile: d.profiles
          }));
        }
      }
    } catch {}

    // Local fallback
    const rawViews = localStorage.getItem(LOCAL_VIEWS_KEY);
    const rawLikes = localStorage.getItem(LOCAL_LIKES_KEY);
    const viewsMap = rawViews ? JSON.parse(rawViews) : {};
    const likesMap = rawLikes ? JSON.parse(rawLikes) : {};

    const viewerIds: string[] = viewsMap[statusId] || [];
    const likedIds = new Set(likesMap[statusId] || []);

    return viewerIds.map((vid) => ({
      id: `view_${vid}`,
      viewer_id: vid,
      viewed_at: new Date().toISOString(),
      has_liked: likedIds.has(vid),
      profile: {
        id: vid,
        display_name: 'Yo Contact',
        username: 'contact'
      }
    }));
  }

  /**
   * Toggle muting of a publisher's status updates
   */
  static async toggleMutePublisher(currentUserId: string, publisherId: string): Promise<boolean> {
    const prefs = await this.getPreferences(currentUserId);
    const currentMuted = new Set(prefs.muted_user_ids || []);
    let isNowMuted = false;

    if (currentMuted.has(publisherId)) {
      currentMuted.delete(publisherId);
      isNowMuted = false;
    } else {
      currentMuted.add(publisherId);
      isNowMuted = true;
    }

    await this.savePreferences(currentUserId, {
      muted_user_ids: Array.from(currentMuted)
    });

    return isNowMuted;
  }

  // --- Internal Local Cache Helpers ---
  private static hasViewedLocal(statusId: string, userId?: string): boolean {
    if (!userId) return false;
    const raw = localStorage.getItem(LOCAL_VIEWS_KEY);
    if (!raw) return false;
    try {
      const map = JSON.parse(raw);
      return Boolean(map[statusId]?.includes(userId));
    } catch {
      return false;
    }
  }

  private static hasLikedLocal(statusId: string, userId?: string): boolean {
    if (!userId) return false;
    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    if (!raw) return false;
    try {
      const map = JSON.parse(raw);
      return Boolean(map[statusId]?.includes(userId));
    } catch {
      return false;
    }
  }

  private static getLocalStatuses(): Array<{ status: StatusItem; author: any }> {
    const raw = localStorage.getItem(LOCAL_STATUSES_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private static saveLocalStatus(status: StatusItem, author?: any) {
    const list = this.getLocalStatuses();
    const existingIdx = list.findIndex((x) => x.status.id === status.id);
    const entry = {
      status,
      author: author || {
        id: status.owner_id,
        display_name: 'You',
        username: 'me'
      }
    };
    if (existingIdx >= 0) {
      list[existingIdx] = entry;
    } else {
      list.push(entry);
    }
    localStorage.setItem(LOCAL_STATUSES_KEY, JSON.stringify(list));
  }
}
