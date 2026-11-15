import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, X, Check, Search, Sparkles } from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../yo/Avatar';
import type { Profile } from '../../types';
import type { Chat } from '../yo/YoApp';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroupChat: Chat) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated
}) => {
  const { user } = useAuth();
  const [groupTitle, setGroupTitle] = useState('');
  const [search, setSearch] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setGroupTitle('');
      setSearch('');
      setSelectedUserIds(new Set());
      setError(null);
      return;
    }

    const loadUsers = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .limit(30);

        if (data) {
          setProfiles(data.filter((p: Profile) => p.id !== user?.id));
        }
      } catch (err) {
        console.warn('Failed to load users for group:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [isOpen, user?.id]);

  const toggleSelectUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleCreateGroup = async () => {
    if (!user) return;
    if (!groupTitle.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (selectedUserIds.size === 0) {
      setError('Select at least one member');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Insert Group Conversation
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          title: groupTitle.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (convErr) throw convErr;

      // 2. Insert Conversation Members (Creator as 'owner', others as 'member')
      const memberRows = [
        {
          conversation_id: conv.id,
          user_id: user.id,
          role: 'owner'
        },
        ...Array.from(selectedUserIds).map((uid) => ({
          conversation_id: conv.id,
          user_id: uid,
          role: 'member'
        }))
      ];

      const { error: membersErr } = await supabase
        .from('conversation_members')
        .insert(memberRows);

      if (membersErr) throw membersErr;

      // 3. Post System Welcome Message to Conversation
      await supabase.from('messages').insert({
        conversation_id: conv.id,
        sender_id: user.id,
        message_type: 'system',
        content: `${user.display_name || 'Creator'} created group "${groupTitle.trim()}"`
      });

      const hue = (groupTitle.trim().charCodeAt(0) * 41) % 360;
      const newChat: Chat = {
        id: conv.id,
        name: groupTitle.trim(),
        handle: `${selectedUserIds.size + 1} members`,
        hue,
        last: 'Group created',
        time: 'Just now',
        unread: 0,
        online: true
      };

      onGroupCreated(newChat);
      onClose();
    } catch (err: any) {
      console.error('Failed to create group:', err);
      setError(err?.message || 'Could not create group');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = profiles.filter(
    (p) =>
      p.username.toLowerCase().includes(search.toLowerCase()) ||
      p.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-sm rounded-[28px] glass-strong border border-white/10 p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-2xl bg-brand/20 text-[#2dd4bf]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">New Group</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedUserIds.size} {selectedUserIds.size === 1 ? 'member' : 'members'} selected
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Group Name Input */}
            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">Group Name</label>
              <div className="glass flex items-center rounded-2xl px-3 py-2 border border-white/10">
                <input
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="e.g. Design Team, Family, Friends"
                  className="w-full bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Member Search Bar */}
            <div className="mt-3 flex flex-col gap-2 flex-1 min-h-0">
              <label className="text-xs font-semibold text-slate-300">Add Members</label>
              <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2 text-xs border border-white/10">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search network..."
                  className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-xs"
                />
              </div>

              {/* User Selection List */}
              <div className="flex-1 overflow-y-auto mt-2 space-y-1.5 pr-1 max-h-[200px]">
                {loading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Loading members...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No users found</div>
                ) : (
                  filtered.map((p) => {
                    const isSelected = selectedUserIds.has(p.id);
                    const hue = (p.username.charCodeAt(0) * 37) % 360;
                    const fakeChat: Chat = {
                      id: p.id,
                      name: p.display_name,
                      handle: `@${p.username}`,
                      hue,
                      last: '',
                      time: '',
                      unread: 0,
                      online: true
                    };

                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleSelectUser(p.id)}
                        className={`flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition select-none ${
                          isSelected ? 'bg-primary/20 border border-primary/40' : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <Avatar chat={fakeChat} size={36} />
                        <div className="min-w-0 flex-1 text-left">
                          <div className="text-xs font-semibold truncate text-foreground">{p.display_name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">@{p.username}</div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                            isSelected
                              ? 'bg-primary border-primary text-[#042f2e]'
                              : 'border-white/20'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {error && (
              <div className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-1.5 text-center">
                {error}
              </div>
            )}

            {/* Create Group Button */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                disabled={submitting || !groupTitle.trim() || selectedUserIds.size === 0}
                onClick={handleCreateGroup}
                className="w-full py-2.5 rounded-2xl bg-brand font-bold text-xs text-primary-foreground shadow-glow flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition"
              >
                {submitting ? (
                  <span>Creating group...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Create Group ({selectedUserIds.size} added)</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
