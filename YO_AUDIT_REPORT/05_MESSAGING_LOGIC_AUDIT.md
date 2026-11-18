# 05 — Messaging Logic & Lifecycle Deep Audit

## 1. End-to-End Messaging Lifecycle

```
[User Input] 
     │
     ▼
1. Optimistic UI Entry (cmsg_<timestamp>_<rand>)
     │ ── Appends to React state msgs[] (status: 'sending')
     │ ── Triggers SoundEffectsService.playMessageSent()
     │ ── Triggers HapticsService.medium()
     │
     ├──► 2. Sub-second P2P Realtime Broadcast
     │         (channel: room_${convId}, event: 'new_msg')
     │         (channel: global_messages_listener)
     │
     └──► 3. Outbox Service RPC Call
               (public.send_message)
                     │
                     ▼
           [PostgreSQL Stored Procedure]
           - Verifies conversation membership
           - Increments monotonic sequence_number
           - Updates conversation last_message_preview
           - Inserts into public.messages
                     │
                     ▼
           Returns canonical DB message row
                     │
     ┌───────────────┴───────────────┐
     ▼                               ▼
4. Sender Reconciliation     5. Recipient Ingestion
   Replaces optimistic ID       Receives via CDC / Broadcast
   Status -> 'sent' (✓)        Updates chatsList unread count
                               Fires NotificationService banner
                               Fires VoiceAssistantService TTS
                                     │
                                     ▼
                             6. Delivery Receipt
                                RPC: acknowledge_delivery
                                Sets delivered_at = NOW()
                                Sender status -> 'delivered' (✓✓)
                                     │
                                     ▼
                             7. Read Watermark
                                When ChatView is opened:
                                RPC: acknowledge_conversation_read
                                Sets last_read_at, read_at = NOW()
                                Sender status -> 'read' (Blue ✓✓)
```

---

## 2. Unread Count Audit

### A. Calculation Method
Unread counts are calculated via a hybrid watermark pattern in [YoApp.tsx lines 3023-3054](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/components/yo/YoApp.tsx#L3023-L3054):
1. **Active Screen Check**: If `openRef.current?.id === conv.id`, unread count is strictly `0`.
2. **Local vs. Remote Watermark Reconciliation**: The client reads `effectiveRead = MAX(localLastRead, dbLastRead)`.
3. **Database Counting Query**:
   ```ts
   const { count } = await supabase
     .from('messages')
     .select('id', { count: 'exact', head: true })
     .eq('conversation_id', conv.id)
     .neq('sender_id', user.id)
     .gt('created_at', effectiveRead);
   ```
4. **Realtime Increments**: When an incoming message arrives via `global_messages_listener`, `setChatsList` checks if the user is currently reading the chat. If not, it increments `(c.unread || 0) + 1`.

### B. Audit Findings & Accuracy
- **Sender's Own Messages Excluded**: Verified via `.neq('sender_id', user.id)`. The sender's messages never increment the unread badge.
- **Double Counting Guard**: In `global_messages_listener`, duplicate broadcasts and database change events are filtered using `seenMsgIdsRef.current.has(msgIdStr)`.
- **Watermark Reset**: When exiting a chat, [YoApp.tsx line 3732](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/components/yo/YoApp.tsx#L3732) writes to `localStorage` and executes `mark_conversation_read(conv.id)`, resetting the unread counter both locally and in PostgreSQL.

---

## 3. Message Status Receipts Verification

| Status | Visual Indicator | Authoritative Source of Truth |
| :--- | :--- | :--- |
| **`sending`** | Clock icon (`Clock`) | Client memory (`client_message_id` before server RPC response) |
| **`sent`** | Single grey checkmark (`Check`) | Message committed to PostgreSQL table `public.messages` |
| **`delivered`** | Double grey checkmark (`CheckCheck`) | Row present in `public.message_receipts` with non-null `delivered_at` |
| **`read`** | Double cyan/blue checkmark (`CheckCheck text-primary`) | Row present in `public.message_receipts` with non-null `read_at` |
| **`failed`** | Red exclamation alert (`AlertCircle`) | Outbox failure after max retries |

---

## 4. Message Ordering & Timestamps
- **Sequence Guarantee**: The database RPC assigns a monotonic `sequence_number` (BIGINT) per conversation. When sorting in the UI, messages are ordered chronologically by `created_at` and `sequence_number`.
- **Date Separators**: [DateSeparator.tsx](file:///c:/Users/anger/OneDrive/Desktop/My%20projects/Yo!!!/src/features/messaging/components/DateSeparator.tsx) calculates day differences between adjacent messages, inserting formatted badges:
  - "Today"
  - "Yesterday"
  - Formatted calendar date (e.g. "November 17, 2026")
