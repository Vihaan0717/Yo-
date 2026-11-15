import { supabase } from '../../../services/supabase/client';
import type { OutboxItem, EngineMessage, MessageType, QuotedMessage } from '../types';

const OUTBOX_STORAGE_KEY = 'yo_message_outbox_v1';

export class MessageOutboxService {
  private static listeners: Array<(items: OutboxItem[]) => void> = [];

  static getOutbox(): OutboxItem[] {
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static saveOutbox(items: OutboxItem[]) {
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
      this.notify(items);
    } catch {
      // ignore
    }
  }

  static subscribe(fn: (items: OutboxItem[]) => void): () => void {
    this.listeners.push(fn);
    fn(this.getOutbox());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private static notify(items: OutboxItem[]) {
    this.listeners.forEach((l) => l(items));
  }

  static generateClientId(): string {
    return `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Queue and dispatch message with optimistic UI and network retry persistence
   */
  static async send({
    conversationId,
    senderId,
    content,
    messageType = 'text',
    replyTo,
    replyQuote
  }: {
    conversationId: string;
    senderId: string;
    content: string;
    messageType?: MessageType;
    replyTo?: string;
    replyQuote?: QuotedMessage;
  }): Promise<{ message?: EngineMessage; error?: string }> {
    const clientMessageId = this.generateClientId();
    const createdAt = new Date().toISOString();

    const outboxItem: OutboxItem = {
      client_message_id: clientMessageId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: messageType,
      reply_to: replyTo,
      reply_quote: replyQuote,
      created_at: createdAt,
      status: 'sending',
      retry_count: 0
    };

    // Save to outbox
    const current = this.getOutbox();
    this.saveOutbox([...current, outboxItem]);

    return this.executeSend(outboxItem);
  }

  /**
   * Retry sending a failed outbox item
   */
  static async retry(clientMessageId: string): Promise<{ message?: EngineMessage; error?: string }> {
    const items = this.getOutbox();
    const item = items.find((i) => i.client_message_id === clientMessageId);
    if (!item) return { error: 'Item not found in outbox' };

    item.status = 'sending';
    item.retry_count += 1;
    this.saveOutbox([...items]);

    return this.executeSend(item);
  }

  /**
   * Internal execution of RPC or direct fallback with idempotency check
   */
  private static async executeSend(item: OutboxItem): Promise<{ message?: EngineMessage; error?: string }> {
    try {
      // 1. Try server-side idempotent send_message RPC
      const { data, error } = await supabase.rpc('send_message', {
        p_client_message_id: item.client_message_id,
        p_conversation_id: item.conversation_id,
        p_content: item.content,
        p_message_type: item.message_type,
        p_reply_to: item.reply_to || null
      });

      if (!error && data) {
        // Remove from outbox on successful server persistence
        const remaining = this.getOutbox().filter((i) => i.client_message_id !== item.client_message_id);
        this.saveOutbox(remaining);

        const persistedMessage: EngineMessage = {
          id: data.id,
          conversation_id: data.conversation_id,
          sender_id: data.sender_id,
          sequence_number: Number(data.sequence_number) || undefined,
          client_message_id: data.client_message_id,
          message_type: data.message_type,
          content: data.content,
          reply_to: data.reply_to,
          reply_quote: item.reply_quote,
          created_at: data.created_at,
          is_own: true,
          status: 'sent',
          image_url: data.message_type === 'image' ? data.content : undefined,
          audio_url: data.message_type === 'audio' ? data.content : undefined
        };

        return { message: persistedMessage };
      }

      // 2. Resilient fallback if RPC is pending in dashboard SQL runner
      if (error && error.code === 'PGRST202') {
        const { data: inserted, error: insertErr } = await supabase
          .from('messages')
          .insert({
            conversation_id: item.conversation_id,
            sender_id: item.sender_id,
            content: item.content,
            message_type: item.message_type,
            reply_to: item.reply_to || null
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Remove from outbox
        const remaining = this.getOutbox().filter((i) => i.client_message_id !== item.client_message_id);
        this.saveOutbox(remaining);

        const fallbackMsg: EngineMessage = {
          id: inserted.id,
          conversation_id: inserted.conversation_id,
          sender_id: inserted.sender_id,
          message_type: inserted.message_type,
          content: inserted.content,
          reply_to: inserted.reply_to,
          reply_quote: item.reply_quote,
          created_at: inserted.created_at,
          is_own: true,
          status: 'sent',
          image_url: inserted.message_type === 'image' ? inserted.content : undefined,
          audio_url: inserted.message_type === 'audio' ? inserted.content : undefined
        };

        return { message: fallbackMsg };
      }

      throw error;
    } catch (err: any) {
      console.warn('Message send failed, preserving in outbox:', err);

      // Update item to failed state in outbox
      const items = this.getOutbox().map((i) => {
        if (i.client_message_id === item.client_message_id) {
          return { ...i, status: 'failed' as const, error: err?.message || 'Network error' };
        }
        return i;
      });
      this.saveOutbox(items);

      return { error: err?.message || 'Failed to send' };
    }
  }

  /**
   * Listen to browser online event and auto-retry failed outbox items
   */
  static initAutoRetry() {
    window.addEventListener('online', () => {
      const items = this.getOutbox().filter((i) => i.status === 'failed' || i.status === 'sending');
      items.forEach((item) => this.retry(item.client_message_id));
    });
  }
}

// Auto-initialize online retry listener
if (typeof window !== 'undefined') {
  MessageOutboxService.initAutoRetry();
}
