import React, { useState } from 'react';
import { 
  Camera, 
  Pencil, 
  ChevronRight, 
  Plus, 
  Lock,
  Clock
} from 'lucide-react';
import type { UserStoryGroup } from '../../services/stories/StoryService';

interface StatusTabProps {
  storyGroups: UserStoryGroup[];
  currentUserId?: string;
  onOpenStory: (groupIndex: number) => void;
  onAddStoryText: () => void;
  onAddStoryMedia: () => void;
}

export const StatusTab: React.FC<StatusTabProps> = ({
  storyGroups,
  currentUserId,
  onOpenStory,
  onAddStoryText,
  onAddStoryMedia
}) => {
  const ownGroup = storyGroups.find((g) => g.user.id === currentUserId);
  const ownIndex = storyGroups.findIndex((g) => g.user.id === currentUserId);
  
  const recentUpdates = storyGroups.filter((g) => g.user.id !== currentUserId && !g.allViewed);
  const viewedUpdates = storyGroups.filter((g) => g.user.id !== currentUserId && g.allViewed);

  const [viewedMutedCollapsed, setViewedMutedCollapsed] = useState(false);

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / (60 * 1000));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins} minutes ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Today, ${new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return 'Yesterday';
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-32 select-none">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-white/10 px-5 py-3.5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">Status</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={onAddStoryMedia}
            className="p-2 rounded-full glass hover:bg-white/10 text-white transition cursor-pointer"
            title="Camera status"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* 1. MY STATUS ROW */}
        <div className="flex items-center justify-between p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer">
          <div 
            onClick={() => {
              if (ownGroup && ownGroup.stories.length > 0) {
                onOpenStory(ownIndex);
              } else {
                onAddStoryMedia();
              }
            }}
            className="flex items-center gap-3.5 flex-1 min-w-0"
          >
            <div className="relative">
              <div className={`w-14 h-14 rounded-full p-0.5 flex items-center justify-center ${
                ownGroup && ownGroup.stories.length > 0
                  ? 'bg-gradient-to-tr from-[#25d366] via-teal-400 to-emerald-500 shadow-glow'
                  : ''
              }`}>
                <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center font-bold text-white text-base">
                  {ownGroup?.user?.avatar_url ? (
                    <img src={ownGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>You</span>
                  )}
                </div>
              </div>

              {/* Green Plus badge if no stories or add button */}
              {(!ownGroup || ownGroup.stories.length === 0) && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#25d366] text-slate-950 flex items-center justify-center font-bold border-2 border-slate-900 shadow-md">
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white text-sm">My Status</h3>
              <p className="text-xs text-white/50 truncate">
                {ownGroup && ownGroup.stories.length > 0
                  ? `${ownGroup.stories.length} update${ownGroup.stories.length > 1 ? 's' : ''} · ${formatTimeAgo(ownGroup.latestTimestamp)}`
                  : 'Tap to add status update'}
              </p>
            </div>
          </div>

          {/* Quick Dual Action Buttons (WhatsApp Style: Pencil for Text, Camera for Media) */}
          <div className="flex items-center gap-2 pl-2">
            <button
              onClick={onAddStoryText}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              title="Add text status"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={onAddStoryMedia}
              className="w-9 h-9 rounded-full bg-brand hover:opacity-90 text-primary-foreground flex items-center justify-center shadow-glow transition cursor-pointer"
              title="Add photo or video status"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. RECENT UPDATES SECTION */}
        {recentUpdates.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Recent updates
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {recentUpdates.map((group) => {
                const groupIdx = storyGroups.findIndex((g) => g.user.id === group.user.id);
                const storyCount = group.stories.length;

                return (
                  <div
                    key={group.user.id}
                    onClick={() => onOpenStory(groupIdx)}
                    className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer"
                  >
                    {/* Multi-segment status ring (WhatsApp exact style) */}
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
                );
              })}
            </div>
          </div>
        )}

        {/* 3. VIEWED UPDATES SECTION */}
        {viewedUpdates.length > 0 && (
          <div className="pt-2">
            <div 
              onClick={() => setViewedMutedCollapsed(!viewedMutedCollapsed)}
              className="flex items-center justify-between px-2 mb-2 cursor-pointer group"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50 group-hover:text-white transition">
                Viewed updates ({viewedUpdates.length})
              </span>
              <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${viewedMutedCollapsed ? '' : 'rotate-90'}`} />
            </div>

            {!viewedMutedCollapsed && (
              <div className="divide-y divide-white/5">
                {viewedUpdates.map((group) => {
                  const groupIdx = storyGroups.findIndex((g) => g.user.id === group.user.id);
                  const storyCount = group.stories.length;

                  return (
                    <div
                      key={group.user.id}
                      onClick={() => onOpenStory(groupIdx)}
                      className="flex items-center gap-3.5 p-2 rounded-2xl hover:bg-white/5 transition cursor-pointer opacity-75 hover:opacity-100"
                    >
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp End-to-End Encrypted Status Banner */}
        <div className="pt-6 pb-2 text-center flex flex-col items-center gap-1 text-[11px] text-white/40">
          <div className="flex items-center gap-1.5 text-accent font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Your status updates are end-to-end encrypted</span>
          </div>
          <p className="max-w-xs leading-relaxed text-white/30 text-[10px]">
            Status updates disappear automatically after 24 hours. Only your contacts can view them.
          </p>
        </div>
      </div>
    </div>
  );
};
