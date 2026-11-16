import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Crown,
  Trash2
} from 'lucide-react';
import { supabase } from '../../services/supabase/client';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../yo/Avatar';
import type { Profile } from '../../types';
import type { Chat } from '../yo/YoApp';

interface GroupMemberInfo {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profile: Profile;
}

interface GroupInfoDrawerProps {
  isOpen: boolean;
  chat: Chat;
  onClose: () => void;
  onLeaveGroup: () => void;
  onMemberCountUpdated?: (newCount: number) => void;
}

export const GroupInfoDrawer: React.FC<GroupInfoDrawerProps> = ({
  isOpen,
  chat,
  onClose,
  onLeaveGroup,
  onMemberCountUpdated
}) => {
  const { user } = useAuth();
  const [members, setMembers] = useState<GroupMemberInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [candidateUsers, setCandidateUsers] = useState<Profile[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);

  // Current user's role in this group
  const myRole = members.find((m) => m.user_id === user?.id)?.role || 'member';
  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

  const loadMembers = async () => {
    if (!chat.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversation_members')
        .select('user_id, role, joined_at, profiles(*)')
        .eq('conversation_id', chat.id);

      if (!error && data) {
        const formatted: GroupMemberInfo[] = data.map((item: any) => ({
          user_id: item.user_id,
          role: item.role,
          joined_at: item.joined_at,
          profile: item.profiles || {
            id: item.user_id,
            username: `user_${item.user_id.slice(0, 6)}`,
            display_name: 'Yo User',
            is_discoverable: true,
            created_at: new Date().toISOString()
          }
        }));
        // Sort: Owner first, then admins, then members
        formatted.sort((a, b) => {
          const rank = { owner: 0, admin: 1, member: 2 };
          return rank[a.role] - rank[b.role];
        });
        setMembers(formatted);
        onMemberCountUpdated?.(formatted.length);
      }
    } catch (err) {
      console.warn('Failed to load group members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMembers();
      setShowAddMember(false);
    }
  }, [isOpen, chat.id]);

  // Load non-member users for add modal
  useEffect(() => {
    if (!showAddMember || !user) return;
    const fetchCandidates = async () => {
      try {
        const { data } = await supabase.from('profiles').select('*').limit(30);
        if (data) {
          const currentMemberIds = new Set(members.map((m) => m.user_id));
          setCandidateUsers(data.filter((p) => !currentMemberIds.has(p.id)));
        }
      } catch (err) {
        console.warn('Failed to load candidate users:', err);
      }
    };
    fetchCandidates();
  }, [showAddMember, members, user]);

  const handleAddMember = async (targetUser: Profile) => {
    if (!user || !isOwnerOrAdmin) return;
    setAddingId(targetUser.id);
    try {
      const { error } = await supabase.from('conversation_members').insert({
        conversation_id: chat.id,
        user_id: targetUser.id,
        role: 'member'
      });

      if (!error) {
        // System broadcast message
        await supabase.from('messages').insert({
          conversation_id: chat.id,
          sender_id: user.id,
          message_type: 'system',
          content: `${user.display_name || 'Admin'} added ${targetUser.display_name}`
        });

        await loadMembers();
        setShowAddMember(false);
      }
    } catch (err) {
      console.warn('Failed to add member:', err);
    } finally {
      setAddingId(null);
    }
  };

  const handlePromoteToAdmin = async (targetUserId: string) => {
    if (myRole !== 'owner') return;
    try {
      await supabase
        .from('conversation_members')
        .update({ role: 'admin' })
        .match({ conversation_id: chat.id, user_id: targetUserId });
      await loadMembers();
    } catch (err) {
      console.warn('Failed to promote member:', err);
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!isOwnerOrAdmin || !user) return;
    try {
      await supabase
        .from('conversation_members')
        .delete()
        .match({ conversation_id: chat.id, user_id: targetUserId });

      await supabase.from('messages').insert({
        conversation_id: chat.id,
        sender_id: user.id,
        message_type: 'system',
        content: `${user.display_name || 'Admin'} removed ${targetName}`
      });

      await loadMembers();
    } catch (err) {
      console.warn('Failed to remove member:', err);
    }
  };

  const handleLeave = async () => {
    if (!user) return;
    try {
      await supabase
        .from('conversation_members')
        .delete()
        .match({ conversation_id: chat.id, user_id: user.id });

      await supabase.from('messages').insert({
        conversation_id: chat.id,
        sender_id: user.id,
        message_type: 'system',
        content: `${user.display_name || 'Member'} left the group`
      });

      onLeaveGroup();
    } catch (err) {
      console.warn('Failed to leave group:', err);
    }
  };

  const filteredCandidates = candidateUsers.filter(
    (p) =>
      p.username.toLowerCase().includes(candidateSearch.toLowerCase()) ||
      p.display_name.toLowerCase().includes(candidateSearch.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Right slide-in drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-sm h-full glass-strong border-l border-white/10 p-5 shadow-2xl flex flex-col justify-between overflow-y-auto"
          >
            {/* Header & Avatar */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Details</span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center py-5 text-center">
                <Avatar chat={chat} size={72} />
                <h3 className="mt-3 text-lg font-bold text-foreground">{chat.name}</h3>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
                </span>
              </div>

              {/* Add Member Button for Admins */}
              {isOwnerOrAdmin && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="w-full py-2.5 rounded-2xl glass hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-xs font-semibold text-primary transition cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Member</span>
                  </button>
                </div>
              )}

              {/* Members List Section */}
              <div className="mt-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">
                  Members ({members.length})
                </div>

                {loading ? (
                  <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Loading members...</div>
                ) : (
                  <div className="space-y-1">
                    {members.map((m) => {
                      const isMe = m.user_id === user?.id;
                      const hue = (m.profile.username.charCodeAt(0) * 37) % 360;
                      const fakeChat: Chat = {
                        id: m.profile.id,
                        name: m.profile.display_name,
                        handle: `@${m.profile.username}`,
                        hue,
                        last: '',
                        time: '',
                        unread: 0,
                        online: true
                      };

                      return (
                        <div
                          key={m.user_id}
                          className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Avatar chat={fakeChat} size={38} />
                            <div className="min-w-0 flex-1 text-left">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold truncate text-foreground">
                                  {m.profile.display_name}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded text-muted-foreground">You</span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                @{m.profile.username}
                              </span>
                            </div>
                          </div>

                          {/* Member Role Badges & Actions */}
                          <div className="flex items-center gap-1.5">
                            {m.role === 'owner' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                                <Crown className="w-3 h-3" />
                                <span>Owner</span>
                              </span>
                            ) : m.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-400 bg-teal-400/10 border border-teal-400/20 px-2 py-0.5 rounded-full">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Admin</span>
                              </span>
                            ) : myRole === 'owner' ? (
                              <button
                                onClick={() => handlePromoteToAdmin(m.user_id)}
                                title="Promote to Admin"
                                className="text-[10px] text-muted-foreground hover:text-white p-1 hover:bg-white/10 rounded cursor-pointer"
                              >
                                Make Admin
                              </button>
                            ) : null}

                            {/* Remove member button for admin/owner */}
                            {isOwnerOrAdmin && !isMe && m.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveMember(m.user_id, m.profile.display_name)}
                                title="Remove member"
                                className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions: Leave Group */}
            <div className="pt-4 border-t border-white/10 mt-6">
              <button
                onClick={handleLeave}
                className="w-full py-2.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 flex items-center justify-center gap-2 text-xs font-bold transition active:scale-[0.98] cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave Group</span>
              </button>
            </div>

            {/* Sub-Modal: Add Member Candidate Picker */}
            <AnimatePresence>
              {showAddMember && (
                <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddMember(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative z-10 w-full max-w-xs glass-strong border border-white/10 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[70vh]"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="text-xs font-bold text-foreground">Add to {chat.name}</span>
                      <button onClick={() => setShowAddMember(false)} className="p-1 text-muted-foreground hover:text-white cursor-pointer">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="glass flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs my-3 border border-white/10">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        placeholder="Search users..."
                        className="w-full bg-transparent outline-none text-foreground text-xs placeholder:text-muted-foreground"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                      {filteredCandidates.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">No users available</div>
                      ) : (
                        filteredCandidates.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => handleAddMember(p)}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 cursor-pointer transition select-none"
                          >
                            <div className="min-w-0 flex-1 text-left">
                              <div className="text-xs font-semibold truncate text-foreground">{p.display_name}</div>
                              <div className="text-[10px] text-muted-foreground truncate">@{p.username}</div>
                            </div>
                            <button
                              disabled={addingId === p.id}
                              className="px-2.5 py-1 rounded-lg bg-brand text-[10px] font-bold text-primary-foreground shadow-glow cursor-pointer disabled:opacity-50"
                            >
                              {addingId === p.id ? 'Adding...' : 'Add'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
