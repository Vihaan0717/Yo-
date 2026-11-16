import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Send
} from 'lucide-react';
import { StoryService, type UserStoryGroup, type StoryItem, type StoryViewer } from '../../services/stories/StoryService';

interface StoryViewerModalProps {
  groups: UserStoryGroup[];
  initialGroupIndex: number;
  currentUserId?: string;
  onClose: () => void;
  onReplyToStory?: (storyAuthorId: string, storySnippet: string, replyText: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onReplyToStory
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [replyText, setReplyText] = useState('');
  const timerRef = useRef<any>(null);

  const currentGroup = groups[groupIndex];
  const currentStory: StoryItem | undefined = currentGroup?.stories[storyIndex];
  const isOwnStory = currentGroup?.user.id === currentUserId;

  const STORY_DURATION_MS = currentStory?.media_type === 'video' ? 10000 : 5000;

  // Record view when a story opens
  useEffect(() => {
    if (currentStory && currentUserId && !isOwnStory) {
      StoryService.recordStoryView(currentStory.id, currentUserId);
    }
  }, [currentStory?.id, currentUserId, isOwnStory]);

  // Load viewers if own story
  useEffect(() => {
    if (currentStory && isOwnStory) {
      StoryService.getStoryViewers(currentStory.id).then((v) => setViewers(v));
    }
  }, [currentStory?.id, isOwnStory]);

  // Timer loop for progress bar
  useEffect(() => {
    if (!currentStory || isPaused || showViewersDrawer) return;

    const interval = 50; // update every 50ms
    const step = (interval / STORY_DURATION_MS) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStory, isPaused, showViewersDrawer, groupIndex, storyIndex]);

  const handleNext = () => {
    setProgress(0);
    if (!currentGroup) return;

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStoryIndex(Math.max(0, prevGroup.stories.length - 1));
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReplyToStory || !currentGroup || !currentStory) return;
    const snippet = currentStory.caption || (currentStory.media_type === 'image' ? 'Photo Story' : 'Story');
    onReplyToStory(currentGroup.user.id, snippet, replyText.trim());
    setReplyText('');
    onClose();
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-3xl select-none">
      <div 
        className="relative w-full max-w-md h-full max-h-[880px] flex flex-col justify-between overflow-hidden shadow-2xl rounded-none md:rounded-3xl border border-white/10"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Progress Segment Bars */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5">
          {currentGroup.stories.map((s, idx) => {
            let widthPercent = 0;
            if (idx < storyIndex) widthPercent = 100;
            else if (idx === storyIndex) widthPercent = progress;

            return (
              <div key={s.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            );
          })}
        </div>

        {/* Story Header (Author Profile & Controls) */}
        <div className="absolute top-6 inset-x-3 z-30 flex items-center justify-between text-white drop-shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-teal-500/20 border border-white/40 flex items-center justify-center font-bold text-sm">
              {currentGroup.user.avatar_url ? (
                <img src={currentGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{currentGroup.user.display_name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight drop-shadow-sm">{currentGroup.user.display_name}</p>
              <p className="text-[10px] text-white/70">
                {new Date(currentStory.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Middle Media Display */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {currentStory.media_type === 'text' ? (
            <div className={`w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${currentStory.bg_gradient || 'from-teal-600 to-cyan-800'}`}>
              <p className="text-xl md:text-2xl font-bold text-white tracking-wide leading-relaxed drop-shadow-md max-w-xs">
                {currentStory.caption || currentStory.media_url}
              </p>
            </div>
          ) : currentStory.media_type === 'video' ? (
            <video
              src={currentStory.media_url}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="w-full h-full object-cover"
            />
          )}

          {/* Image/Video Caption Banner */}
          {currentStory.media_type !== 'text' && currentStory.caption && (
            <div className="absolute bottom-16 inset-x-4 p-3 rounded-2xl glass-strong text-white text-xs text-center backdrop-blur-xl border border-white/20 shadow-lg">
              {currentStory.caption}
            </div>
          )}

          {/* Left / Right Tap Click Navigation Hitboxes */}
          <div 
            onClick={handlePrev}
            className="absolute left-0 top-16 bottom-16 w-1/3 cursor-pointer z-20 flex items-center pl-2 opacity-0 hover:opacity-40 transition-opacity"
          >
            <ChevronLeft className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
          <div 
            onClick={handleNext}
            className="absolute right-0 top-16 bottom-16 w-1/3 cursor-pointer z-20 flex items-center justify-end pr-2 opacity-0 hover:opacity-40 transition-opacity"
          >
            <ChevronRight className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        </div>

        {/* Bottom Bar: Reply Input or Viewers Counter (for author) */}
        <div className="relative z-30 p-3 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {isOwnStory ? (
            <div className="flex items-center justify-between px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowViewersDrawer(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full glass hover:bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition cursor-pointer"
              >
                <Eye className="w-4 h-4 text-primary" />
                <span>{viewers.length} {viewers.length === 1 ? 'view' : 'views'}</span>
              </button>

              <button
                onClick={onClose}
                className="text-xs text-white/70 hover:text-white"
              >
                Your Story
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to ${currentGroup.user.display_name}...`}
                className="flex-1 glass text-white placeholder:text-white/60 text-xs rounded-full px-4 py-2.5 outline-none border border-white/20 focus:border-primary transition"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="w-10 h-10 rounded-full bg-brand text-primary-foreground flex items-center justify-center shadow-glow disabled:opacity-40 cursor-pointer transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* Viewers Bottom Drawer (for Story Authors) */}
        <AnimatePresence>
          {showViewersDrawer && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 z-40 max-h-[60%] rounded-t-3xl glass-strong border-t border-white/20 p-5 text-white flex flex-col shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">Viewed by {viewers.length}</span>
                </div>
                <button
                  onClick={() => setShowViewersDrawer(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5 py-2">
                {viewers.length === 0 ? (
                  <p className="text-xs text-center py-6 text-white/50">No views yet.</p>
                ) : (
                  viewers.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-white/20 flex items-center justify-center text-xs font-bold">
                          {v.profile?.display_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{v.profile?.display_name || 'Yo Contact'}</p>
                          <p className="text-[10px] text-white/50">
                            {new Date(v.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
