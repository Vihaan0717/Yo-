/**
 * types.ts
 * Authoritative types for the Yo!!! Status & Updates engine.
 */

export type StatusContentType = 'text' | 'image' | 'video' | 'audio' | 'layout';

export type StatusAudienceMode = 'contacts' | 'except' | 'only';

export type StatusPublicationState = 'draft' | 'uploading' | 'published' | 'expired' | 'deleted';

export interface StatusMetadata {
  bgGradient?: string;
  fontFamily?: string;
  fontSize?: number;
  textColor?: string;
  stickers?: Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }>;
  audioDurationSec?: number;
  audioWaveform?: number[];
  layoutSlices?: string[]; // for collage layout
}

export interface StatusItem {
  id: string;
  owner_id: string;
  content_type: StatusContentType;
  text_content?: string;
  media_path?: string;
  thumbnail_path?: string;
  caption?: string;
  audience_mode: StatusAudienceMode;
  publication_state: StatusPublicationState;
  metadata?: StatusMetadata;
  created_at: string;
  expires_at: string;
  views_count?: number;
  likes_count?: number;
  has_viewed?: boolean;
  has_liked?: boolean;
}

export interface StatusAudienceRule {
  status_id: string;
  user_id: string;
  rule: 'include' | 'exclude';
}

export interface StatusViewer {
  id: string;
  viewer_id: string;
  viewed_at: string;
  has_liked?: boolean;
  profile?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

export interface UserStatusGroup {
  user: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
  statuses: StatusItem[];
  allViewed: boolean;
  isMuted?: boolean;
  latestTimestamp: string;
}

export interface UserStatusPreferences {
  user_id: string;
  default_audience_mode: StatusAudienceMode;
  muted_user_ids: string[];
  read_receipts_enabled: boolean;
}
