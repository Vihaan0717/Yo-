import React from 'react';
import { Plus } from 'lucide-react';
import type { UserStoryGroup } from '../../services/stories/StoryService';

interface StoriesTrayProps {
  groups: UserStoryGroup[];
  currentUserId?: string;
  onOpenStory: (groupIndex: number) => void;
  onAddStory: () => void;
}

export const StoriesTray: React.FC<StoriesTrayProps> = ({
  groups,
  currentUserId,
  onOpenStory,
  onAddStory
}) => {
  const ownGroup = groups.find((g) => g.user.id === currentUserId);
  const otherGroups = groups.filter((g) => g.user.id !== currentUserId);

  return (
    <div className="flex items-center gap-3 overflow-x-auto px-5 py-3 scrollbar-none select-none">
      {/* 1. Add Story Bubble / Own Story Indicator */}
      <div 
        onClick={() => {
          if (ownGroup && ownGroup.stories.length > 0) {
            const idx = groups.findIndex((g) => g.user.id === currentUserId);
            onOpenStory(idx);
          } else {
            onAddStory();
          }
        }}
        className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
      >
        <div className="relative">
          <div className={`w-14 h-14 rounded-full p-0.5 flex items-center justify-center transition-transform group-hover:scale-105 ${
            ownGroup && ownGroup.stories.length > 0
              ? 'bg-gradient-to-tr from-teal-400 via-cyan-400 to-emerald-400'
              : 'border-2 border-dashed border-white/30'
          }`}>
            <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-white font-bold text-sm">
              {ownGroup?.user?.avatar_url ? (
                <img src={ownGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>You</span>
              )}
            </div>
          </div>

          {/* Plus Badge */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddStory();
            }}
            className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand text-primary-foreground flex items-center justify-center shadow-md border-2 border-slate-900 group-hover:scale-110 transition-transform cursor-pointer"
            title="Add to your story"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
        <span className="text-[11px] font-medium text-white/90 max-w-[58px] truncate">
          {ownGroup && ownGroup.stories.length > 0 ? 'Your Story' : 'Add Story'}
        </span>
      </div>

      {/* 2. Contacts' Stories with Gradient Unviewed Rings */}
      {otherGroups.map((group) => {
        const fullIndex = groups.findIndex((g) => g.user.id === group.user.id);
        const hasUnviewed = !group.allViewed;

        return (
          <div
            key={group.user.id}
            onClick={() => onOpenStory(fullIndex)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className={`w-14 h-14 rounded-full p-0.5 flex items-center justify-center transition-transform group-hover:scale-105 ${
              hasUnviewed
                ? 'bg-gradient-to-tr from-teal-400 via-cyan-500 to-indigo-500 shadow-glow'
                : 'border border-white/20'
            }`}>
              <div className="w-full h-full rounded-full bg-slate-900 overflow-hidden flex items-center justify-center text-white font-bold text-sm">
                {group.user.avatar_url ? (
                  <img src={group.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{group.user.display_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <span className={`text-[11px] font-medium max-w-[58px] truncate ${
              hasUnviewed ? 'text-white font-semibold' : 'text-white/60'
            }`}>
              {group.user.display_name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
