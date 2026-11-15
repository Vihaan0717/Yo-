import { supabase } from '../../../services/supabase/client';

export class ReceiptService {
  /**
   * Acknowledge delivery for incoming messages.
   * Only records delivery for messages where current user is NOT the sender.
   */
  static async acknowledgeDelivery(conversationId: string, messageIds: string[], channel?: any): Promise<number> {
    if (!conversationId || !messageIds || messageIds.length === 0) return 0;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    try {
      // 1. Try server RPC
      const { data, error } = await supabase.rpc('acknowledge_delivery', {
        p_conversation_id: conversationId,
        p_message_ids: messageIds
      });

      if (!error && typeof data === 'number') {
        // Broadcast delivery receipt to conversation channel so sender updates ticks immediately
        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'delivery_receipt',
            payload: {
              conversation_id: conversationId,
              message_ids: messageIds,
              recipient_id: user.id,
              delivered_at: new Date().toISOString()
            }
          });
        }
        return data;
      }

      // 2. Fallback direct table upsert if RPC is pending dashboard migration execution
      if (error && error.code === 'PGRST202') {
        const rows = messageIds.map((id) => ({
          message_id: id,
          user_id: user.id,
          delivered_at: new Date().toISOString()
        }));

        await supabase.from('message_receipts').upsert(rows, { onConflict: 'message_id,user_id' });

        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'delivery_receipt',
            payload: {
              conversation_id: conversationId,
              message_ids: messageIds,
              recipient_id: user.id,
              delivered_at: new Date().toISOString()
            }
          });
        }
        return messageIds.length;
      }

      return 0;
    } catch (err) {
      console.warn('Failed to acknowledge delivery:', err);
      return 0;
    }
  }

  /**
   * Acknowledge reading a conversation up to a validated monotonic sequence number.
   * Updates conversation_members cursor and sets read_at in receipts.
   */
  static async acknowledgeConversationRead(
    conversationId: string, 
    maxSequence: number, 
    channel?: any
  ): Promise<boolean> {
    if (!conversationId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    try {
      // 1. Try server RPC
      const { data, error } = await supabase.rpc('acknowledge_conversation_read', {
        p_conversation_id: conversationId,
        p_max_sequence: maxSequence || 0
      });

      if (!error && data) {
        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'read_receipt',
            payload: {
              conversation_id: conversationId,
              reader_id: user.id,
              read_sequence: data.current_sequence || maxSequence,
              read_at: new Date().toISOString()
            }
          });
        }
        return true;
      }

      // 2. Fallback direct update if RPC is pending dashboard migration execution
      if (error && error.code === 'PGRST202') {
        await supabase
          .from('conversation_members')
          .update({ last_read_at: new Date().toISOString() })
          .match({ conversation_id: conversationId, user_id: user.id });

        if (channel) {
          channel.send({
            type: 'broadcast',
            event: 'read_receipt',
            payload: {
              conversation_id: conversationId,
              reader_id: user.id,
              read_sequence: maxSequence,
              read_at: new Date().toISOString()
            }
          });
        }
        return true;
      }

      return false;
    } catch (err) {
      console.warn('Failed to acknowledge read:', err);
      return false;
    }
  }
}
