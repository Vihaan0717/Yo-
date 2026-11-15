import { describe, it, expect } from 'vitest';
import { formatDateLabel } from '../components/DateSeparator';
import type { MessageStatus } from '../types';

describe('Messaging Engine Core Logic', () => {
  describe('Date Separator Formatter', () => {
    it('returns "Today" for current timestamps', () => {
      const now = new Date().toISOString();
      expect(formatDateLabel(now)).toBe('Today');
    });

    it('returns "Yesterday" for timestamps 24 hours ago', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      expect(formatDateLabel(yesterday)).toBe('Yesterday');
    });

    it('formats dates within the same year with month and day', () => {
      const now = new Date();
      // 5 days ago in the same year
      const date = new Date(now.getFullYear(), now.getMonth(), Math.max(1, now.getDate() - 5));
      const formatted = formatDateLabel(date.toISOString());
      expect(formatted).not.toBe('Today');
      expect(formatted).toBeDefined();
    });

    it('includes full year for past years', () => {
      const pastYear = new Date('2023-05-15T10:00:00Z').toISOString();
      expect(formatDateLabel(pastYear)).toContain('2023');
    });
  });

  describe('Receipt State Machine Progression', () => {
    const validTransitions: Record<MessageStatus, MessageStatus[]> = {
      sending: ['sent', 'failed'],
      sent: ['delivered', 'read'],
      delivered: ['read'],
      read: [], // Terminal state
      failed: ['sending'] // Retry
    };

    function canTransition(current: MessageStatus, next: MessageStatus): boolean {
      return validTransitions[current].includes(next);
    }

    it('allows sending -> sent -> delivered -> read', () => {
      expect(canTransition('sending', 'sent')).toBe(true);
      expect(canTransition('sent', 'delivered')).toBe(true);
      expect(canTransition('delivered', 'read')).toBe(true);
    });

    it('allows sent directly to read (if read before delivery tick received)', () => {
      expect(canTransition('sent', 'read')).toBe(true);
    });

    it('strictly forbids state from moving backwards', () => {
      expect(canTransition('read', 'delivered')).toBe(false);
      expect(canTransition('read', 'sent')).toBe(false);
      expect(canTransition('read', 'sending')).toBe(false);
      expect(canTransition('delivered', 'sent')).toBe(false);
      expect(canTransition('delivered', 'sending')).toBe(false);
    });
  });

  describe('Unread Count & Monotonic Cursor Logic', () => {
    interface MockMessage {
      id: string;
      sender_id: string;
      sequence_number: number;
      deleted_at?: string | null;
    }

    function calculateUnreadCount(
      userId: string,
      lastReadSequence: number,
      messages: MockMessage[]
    ): number {
      return messages.filter(
        (m) =>
          m.sender_id !== userId &&
          m.sequence_number > lastReadSequence &&
          !m.deleted_at
      ).length;
    }

    it('excludes messages sent by the logged-in user from unread count', () => {
      const currentUserId = 'user-1';
      const messages: MockMessage[] = [
        { id: 'm1', sender_id: 'user-1', sequence_number: 1 },
        { id: 'm2', sender_id: 'user-1', sequence_number: 2 },
        { id: 'm3', sender_id: 'user-2', sequence_number: 3 },
      ];

      const count = calculateUnreadCount(currentUserId, 0, messages);
      expect(count).toBe(1); // Only m3 is incoming
    });

    it('calculates unread count strictly for messages after read cursor', () => {
      const currentUserId = 'user-2';
      const messages: MockMessage[] = [
        { id: 'm1', sender_id: 'user-1', sequence_number: 1 },
        { id: 'm2', sender_id: 'user-1', sequence_number: 2 },
        { id: 'm3', sender_id: 'user-1', sequence_number: 3 },
        { id: 'm4', sender_id: 'user-1', sequence_number: 4 },
        { id: 'm5', sender_id: 'user-1', sequence_number: 5 },
      ];

      // Read cursor at sequence 3
      const count = calculateUnreadCount(currentUserId, 3, messages);
      expect(count).toBe(2); // Sequences 4 and 5
    });

    it('excludes soft-deleted messages from unread count', () => {
      const currentUserId = 'user-2';
      const messages: MockMessage[] = [
        { id: 'm1', sender_id: 'user-1', sequence_number: 1 },
        { id: 'm2', sender_id: 'user-1', sequence_number: 2, deleted_at: '2026-11-15T12:00:00Z' },
        { id: 'm3', sender_id: 'user-1', sequence_number: 3 },
      ];

      const count = calculateUnreadCount(currentUserId, 0, messages);
      expect(count).toBe(2); // m1 and m3, excluding deleted m2
    });

    it('enforces monotonic cursor advancement (never moves backwards)', () => {
      let cursor = 5;
      const advanceCursor = (requestedSeq: number, maxValidSeq: number) => {
        const capped = Math.min(requestedSeq, maxValidSeq);
        cursor = Math.max(cursor, capped);
        return cursor;
      };

      // Trying to regress backwards to 3
      advanceCursor(3, 10);
      expect(cursor).toBe(5);

      // Advancing to 8
      advanceCursor(8, 10);
      expect(cursor).toBe(8);

      // Attempting to exceed conversation ceiling
      advanceCursor(99, 10);
      expect(cursor).toBe(10);
    });
  });

  describe('Outbox Idempotency', () => {
    it('generates unique client message IDs with expected prefix', () => {
      const id1 = `cmsg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const id2 = `cmsg_${Date.now() + 1}_${Math.random().toString(36).substring(2, 9)}`;
      expect(id1).toMatch(/^cmsg_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
