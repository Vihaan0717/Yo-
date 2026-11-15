/**
 * types.ts
 * Authoritative types for the Yo!!! messaging engine.
 */

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';

export interface MessageReceipt {
  message_id: string;
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
}

export interface QuotedMessage {
  id: string;
  sender_name: string;
  content: string;
}

export interface EngineMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sequence_number?: number;
  client_message_id?: string;
  message_type: MessageType;
  content: string;
  reply_to?: string;
  reply_quote?: QuotedMessage;
  created_at: string;
  is_own: boolean;
  status: MessageStatus;
  reactions?: Record<string, string[]>;
  audio_url?: string;
  image_url?: string;
  delivered_at?: string | null;
  read_at?: string | null;
}

export interface OutboxItem {
  client_message_id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  reply_to?: string;
  reply_quote?: QuotedMessage;
  created_at: string;
  status: MessageStatus;
  retry_count: number;
  error?: string;
}

export interface ConversationUnreadInfo {
  conversation_id: string;
  unread_count: number;
}
