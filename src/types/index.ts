export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  is_discoverable: boolean;
  status_status?: string;
  last_seen_at?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  title?: string;
  avatar_url?: string;
  last_message_preview?: string;
  last_message_at?: string;
  unread_count?: number;
  other_user?: Profile;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // User IDs who reacted
}

export interface QuotedMessage {
  id: string;
  sender_name: string;
  content: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';
  content: string;
  reply_to?: string;
  reply_quote?: QuotedMessage;
  created_at: string;
  is_own?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string[]>; // emoji -> array of user_ids
}

export interface CallSession {
  id: string;
  conversation_id: string;
  initiator_id: string;
  call_type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'failed';
  started_at: string;
}
