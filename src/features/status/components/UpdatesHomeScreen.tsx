import React, { useState, useEffect } from 'react';
import { 
  Search, 
  MoreVertical, 
  Camera, 
  Pencil, 
  ChevronRight, 
  Plus, 
  Lock, 
  Clock, 
  VolumeX, 
  Volume2,
  ShieldCheck,
  X
} from 'lucide-react';
import { StatusService } from '../services/StatusService';
import type { UserStatusGroup } from '../types/status';

interface UpdatesHomeScreenProps {
  currentUserId?: string;
  onOpenStatusViewer: (groupIndex: number) => void;
  onAddStatusText: () => void;
  onAddStatusMedia: () => void;
  onOpenPrivacySettings: () => void;
}

export const UpdatesHomeScreen: React.FC<UpdatesHomeScreenProps> = ({
  currentUserId,
  onOpenStatusViewer,
  onAddStatusText,
  onAddStatusMedia,
  onOpenPrivacySettings
}) => {
  const [data, setData] = useState<{
    ownGroup?: UserStatusGroup;
    recentGroups: UserStatusGroup[];
    viewedGroups: UserStatusGroup[];
    mutedGroups: UserStatusGroup[];
    allGroups: UserStatusGroup[];
  }>({
    recentGroups: [],
    viewedGroups: [],
    mutedGroups: [],
    allGroups: []
  });

  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [viewedCollapsed, setViewedCollapsed] = useState(false);
  const [mutedCollapsed, setMutedCollapsed] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadData = async () => {
    const res = await StatusService.getActiveStatusGroups(currentUserId);
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, [currentUserId]);

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / (60 * 1000));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Today, ${new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return 'Yesterday';
    } catch {
      return 'Recently';
    }
  };

  const handleToggleMute = async (e: React.MouseEvent, publisherId: string) => {
    e.stopPropagation();
    if (!currentUserId) return;
    await StatusService.toggleMutePublisher(currentUserId, publisherId);
    await loadData();
  };

  const filterGroup = (group: UserStatusGroup) => {
    if (!search.trim()) return true;
    return group.user.display_name.toLowerCase().includes(search.toLowerCase().trim()) ||
           group.user.username.toLowerCase().includes(search.toLowerCase().trim());
  };

  const ownGroup = data.ownGroup;
  const ownIndex = data.allGroups.findIndex((g) => g.user.id === currentUserId);

  const filteredRecent = data.recentGroups.filter(filterGroup);
  const filteredViewed = data.viewedGroups.filter(filterGroup);
  const filteredMuted = data.mutedGroups.filter(filterGroup);

  return (
    <div className="flex-1 overflow-y-auto pb-32 select-none">
      {/* Top Navigation Bar: WhatsApp-Inspired Updates Header */}
      <div className="sticky top-0 z-20 glass-strong border-b border-white/10 px-5 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">Updates</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsSearching(!isSearching);
              setSearch('');
            }}
            className="p-2 rounded-full glass hover:bg-white/10 text-white transition cursor-pointer"
            title="Search updates"
          >
            <Search className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-full glass hover:bg-white/10 text-white transition cursor-pointer"
              title="Status options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-12 z-40 w-48 rounded-2xl glass-strong border border-white/20 p-1.5 shadow-2xl backdrop-blur-2xl">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenPrivacySettings();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-white text-xs font-medium transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>Status Privacy</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating In-Updates Search Bar */}
      {isSearching && (
        <div className="glass-strong border-b border-white/10 px-4 py-2 flex items-center gap-2 animate-fadeIn">
          <div className="flex-1 flex items-center gap-2 glass rounded-2xl px-3 py-1.5 text-xs">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search status updates..."
              className="w-full bg-transparent text-white outline-none"
              autoFocus
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="px-4 py-3 space-y-4">
        {/* SECTION 1: STATUS HEADER & MY STATUS CARD */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-base font-bold text-white tracking-tight">Status</h2>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-2xl glass-strong border border-white/10 hover:border-white/20 transition cursor-pointer">
            <div
              onClick={() => {
                if (ownGroup && ownGroup.statuses.length > 0) {
                  onOpenStatusViewer(ownIndex);
                } else {
                  onAddStatusMedia();
                }
              }}
              className="flex items-center gap-3.5 flex-1 min-w-0"
            >
              <div className="relative">
                <div className={`w-14 h-14 rounded-full p-0.5 flex items-center justify-center transition-transform ${
                  ownGroup && ownGroup.statuses.length > 0
                    ? 'bg-gradient-to-tr from-[#25d366] via-teal-400 to-[#00a884] shadow-glow'
                    : 'border-2 border-dashed border-white/30'
                }`}>
                  <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-white text-base">
                    {ownGroup?.user?.avatar_url ? (
                      <img src={ownGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>You</span>
                    )}
                  </div>
                </div>

                {/* WhatsApp Green Plus Badge */}
                {(!ownGroup || ownGroup.statuses.length === 0) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#25d366] text-slate-950 flex items-center justify-center font-bold border-2 border-slate-900 shadow-md">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white text-sm">My Status</h3>
                <p className="text-xs text-white/50 truncate">
                  {ownGroup && ownGroup.statuses.length > 0
                    ? `${ownGroup.statuses.length} update${ownGroup.statuses.length > 1 ? 's' : ''} · ${formatTimeAgo(ownGroup.latestTimestamp)}`
                    : 'Tap to add status update'}
                </p>
              </div>
            </div>

            {/* Quick Dual Actions: WhatsApp Pencil & Camera */}
            <div className="flex items-center gap-2 pl-2">
              <button
                onClick={onAddStatusText}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Create text status"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={onAddStatusMedia}
                className="w-9 h-9 rounded-full bg-brand hover:opacity-90 text-primary-foreground flex items-center justify-center shadow-glow transition cursor-pointer"
                title="Create photo/video status"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: RECENT UPDATES (Unviewed) */}
        {filteredRecent.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Recent updates
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {filteredRecent.map((group) => {
                const groupIdx = data.allGroups.findIndex((g) => g.user.id === group.user.id);
                const storyCount = group.statuses.length;

                return (
                  <div
                    key={group.user.id}
                    onClick={() => onOpenStatusViewer(groupIdx)}
                    className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      {/* Segmented Green Gradient Ring */}
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full p-0.5 flex items-center justify-center bg-gradient-to-tr from-[#25d366] via-teal-400 to-[#00a884] shadow-glow">
                          <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-white text-base">
                            {group.user.avatar_url ? (
                              <img src={group.user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{group.user.display_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm truncate">
                          {group.user.display_name}
                        </h4>
                        <p className="text-xs text-white/50 flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-[#25d366]" />
                          <span>{formatTimeAgo(group.latestTimestamp)}</span>
                          {storyCount > 1 && <span>• {storyCount} updates</span>}
                        </p>
                      </div>
                    </div>

                    {/* Mute button on hover */}
                    <button
                      onClick={(e) => handleToggleMute(e, group.user.id)}
                      className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Mute status updates"
                    >
                      <VolumeX className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 3: VIEWED UPDATES */}
        {filteredViewed.length > 0 && (
          <div className="pt-2">
            <div
              onClick={() => setViewedCollapsed(!viewedCollapsed)}
              className="flex items-center justify-between px-2 mb-2 cursor-pointer group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50 group-hover:text-white transition">
                Viewed updates ({filteredViewed.length})
              </span>
              <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${viewedCollapsed ? '' : 'rotate-90'}`} />
            </div>

            {!viewedCollapsed && (
              <div className="divide-y divide-white/5">
                {filteredViewed.map((group) => {
                  const groupIdx = data.allGroups.findIndex((g) => g.user.id === group.user.id);
                  const storyCount = group.statuses.length;

                  return (
                    <div
                      key={group.user.id}
                      onClick={() => onOpenStatusViewer(groupIdx)}
                      className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer opacity-70 hover:opacity-100 group"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="relative">
                          <div className="w-14 h-14 rounded-full p-0.5 flex items-center justify-center border-2 border-white/20">
                            <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-white text-base">
                              {group.user.avatar_url ? (
                                <img src={group.user.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{group.user.display_name.charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white/90 text-sm truncate">
                            {group.user.display_name}
                          </h4>
                          <p className="text-xs text-white/40 flex items-center gap-1.5 mt-0.5">
                            <span>{formatTimeAgo(group.latestTimestamp)}</span>
                            {storyCount > 1 && <span>• {storyCount} updates</span>}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleToggleMute(e, group.user.id)}
                        className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Mute status updates"
                      >
                        <VolumeX className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: MUTED / HIDDEN UPDATES */}
        {filteredMuted.length > 0 && (
          <div className="pt-2">
            <div
              onClick={() => setMutedCollapsed(!mutedCollapsed)}
              className="flex items-center justify-between px-2 mb-2 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <VolumeX className="w-3.5 h-3.5 text-white/40" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/50 group-hover:text-white transition">
                  Muted updates ({filteredMuted.length})
                </span>
              </div>
              <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${mutedCollapsed ? '' : 'rotate-90'}`} />
            </div>

            {!mutedCollapsed && (
              <div className="divide-y divide-white/5">
                {filteredMuted.map((group) => {
                  const groupIdx = data.allGroups.findIndex((g) => g.user.id === group.user.id);

                  return (
                    <div
                      key={group.user.id}
                      onClick={() => onOpenStatusViewer(groupIdx)}
                      className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer opacity-50 hover:opacity-90 group"
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div className="w-14 h-14 rounded-full border border-dashed border-white/20 flex items-center justify-center p-0.5">
                          <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-white text-base">
                            {group.user.avatar_url ? (
                              <img src={group.user.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span>{group.user.display_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white/80 text-sm truncate">
                            {group.user.display_name}
                          </h4>
                          <p className="text-xs text-white/40 mt-0.5">Muted</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleToggleMute(e, group.user.id)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                        title="Unmute status updates"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Unmute</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: CHANNELS SEPARATION (Clear WhatsApp Layout Architectural Placeholder) */}
        <div className="pt-6 border-t border-white/10">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-base font-bold text-white tracking-tight">Channels</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
              Coming Soon
            </span>
          </div>
          <p className="px-2 text-xs text-white/50 leading-relaxed">
            Stay updated on topics you care about. Personal statuses remain separate and private from channels.
          </p>
        </div>

        {/* WhatsApp End-to-End Encrypted Status Banner */}
        <div className="pt-6 pb-2 text-center flex flex-col items-center gap-1 text-[11px] text-white/40">
          <div className="flex items-center gap-1.5 text-accent font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Your status updates are end-to-end encrypted</span>
          </div>
          <p className="max-w-xs leading-relaxed text-white/30 text-[10px]">
            Status updates disappear automatically after 24 hours. Only your selected audience can view them.
          </p>
        </div>
      </div>
    </div>
  );
};
