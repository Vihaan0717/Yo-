import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Heart, 
  Send,
  Trash2,
  MoreVertical,
  Volume2
} from 'lucide-react';
import { StatusService } from '../services/StatusService';
import type { UserStatusGroup, StatusItem, StatusViewer } from '../types/status';

interface StatusViewerModalProps {
  groups: UserStatusGroup[];
  initialGroupIndex: number;
  currentUserId?: string;
  onClose: () => void;
  onReplyToStatus?: (authorId: string, statusSnippet: string, replyText: string) => void;
  onStatusDeleted?: () => void;
}

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  groups,
  initialGroupIndex,
  currentUserId,
  onClose,
  onReplyToStatus,
  onStatusDeleted
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [statusIndex, setStatusIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [viewers, setViewers] = useState<StatusViewer[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<any>(null);

  const currentGroup = groups[groupIndex];
  const currentStatus: StatusItem | undefined = currentGroup?.statuses[statusIndex];
  const isOwnStatus = currentGroup?.user.id === currentUserId;

  const STATUS_DURATION_MS = currentStatus?.content_type === 'video' ? 10000 : 5000;

  // Record view when opened
  useEffect(() => {
    if (currentStatus && currentUserId && !isOwnStatus) {
      StatusService.recordStatusView(currentStatus.id, currentUserId);
      setIsLiked(Boolean(currentStatus.has_liked));
    }
  }, [currentStatus?.id, currentUserId, isOwnStatus]);

  // Load viewers if own status
  useEffect(() => {
    if (currentStatus && isOwnStatus) {
      StatusService.getStatusViewers(currentStatus.id).then((v) => setViewers(v));
    }
  }, [currentStatus?.id, isOwnStatus]);

  // Progress Bar Timer
  useEffect(() => {
    if (!currentStatus || isPaused || showViewersDrawer) return;

    const interval = 50;
    const step = (interval / STATUS_DURATION_MS) * 100;

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
  }, [currentStatus, isPaused, showViewersDrawer, groupIndex, statusIndex]);

  const handleNext = () => {
    setProgress(0);
    if (!currentGroup) return;

    if (statusIndex < currentGroup.statuses.length - 1) {
      setStatusIndex(statusIndex + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStatusIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    setProgress(0);
    if (statusIndex > 0) {
      setStatusIndex(statusIndex - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(groupIndex - 1);
      setStatusIndex(Math.max(0, prevGroup.statuses.length - 1));
    }
  };

  const handleLike = async () => {
    if (!currentStatus || !currentUserId) return;
    const next = await StatusService.toggleStatusLike(currentStatus.id, currentUserId);
    setIsLiked(next);
    if (next) {
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 800);
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReplyToStatus || !currentGroup || !currentStatus) return;
    const snippet = currentStatus.caption || (currentStatus.content_type === 'image' ? 'Photo Status' : 'Status');
    onReplyToStatus(currentGroup.user.id, snippet, replyText.trim());
    setReplyText('');
    onClose();
  };

  const handleDeleteCurrentStatus = async () => {
    if (!currentStatus || !currentUserId || !isOwnStatus) return;
    if (confirm("Delete this status update? It will be removed for everyone.")) {
      await StatusService.deleteStatus(currentStatus.id, currentUserId);
      onStatusDeleted?.();
      onClose();
    }
  };

  if (!currentGroup || !currentStatus) return null;

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
          {currentGroup.statuses.map((s, idx) => {
            let widthPercent = 0;
            if (idx < statusIndex) widthPercent = 100;
            else if (idx === statusIndex) widthPercent = progress;

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

        {/* Status Header: Profile & Timestamp */}
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
                {new Date(currentStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isOwnStatus && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition cursor-pointer"
                  title="Status options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-36 rounded-2xl glass-strong border border-white/20 p-1.5 shadow-2xl bg-[#0f172a]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        handleDeleteCurrentStatus();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/20 text-xs font-semibold transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete status</span>
                    </button>
                  </div>
                )}
              </div>
            )}

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

        {/* Middle Status Content */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {currentStatus.content_type === 'text' ? (
            <div className={`w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${currentStatus.metadata?.bgGradient || 'from-teal-600 to-cyan-800'}`}>
              <p className="text-xl md:text-2xl font-bold text-white tracking-wide leading-relaxed drop-shadow-md max-w-xs">
                {currentStatus.caption || currentStatus.text_content}
              </p>
            </div>
          ) : currentStatus.content_type === 'video' ? (
            <video
              src={currentStatus.media_path}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : currentStatus.content_type === 'audio' ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-rose-950 via-slate-900 to-zinc-950">
              <div className="w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 mb-6 shadow-glow">
                <Volume2 className="w-12 h-12 animate-pulse text-rose-400" />
              </div>
              <p className="text-lg font-bold text-white mb-2">Voice Status</p>
              <audio src={currentStatus.media_path} autoPlay controls className="w-64 max-w-full mt-2" />
            </div>
          ) : (
            <img
              src={currentStatus.media_path}
              alt="Status"
              className="w-full h-full object-cover"
            />
          )}

          {/* Heart Pop Animation on Like */}
          <AnimatePresence>
            {showHeartPop && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.4, opacity: 1 }}
                exit={{ scale: 1.8, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute z-40 pointer-events-none"
              >
                <Heart className="w-24 h-24 fill-rose-500 text-rose-500 drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Caption Overlay */}
          {currentStatus.content_type !== 'text' && currentStatus.caption && (
            <div className="absolute bottom-16 inset-x-4 p-3 rounded-2xl glass-strong text-white text-xs text-center backdrop-blur-xl border border-white/20 shadow-lg">
              {currentStatus.caption}
            </div>
          )}

          {/* Hitbox Navigation */}
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

        {/* Bottom Bar: Quick Reply or Author Viewers */}
        <div className="relative z-30 p-3 pb-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {isOwnStatus ? (
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

              <span className="text-xs text-white/50">Your Status</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <form onSubmit={handleSendReply} className="flex-1 flex items-center gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${currentGroup.user.display_name}...`}
                  className="flex-1 glass text-white placeholder:text-white/60 text-xs rounded-full px-4 py-2.5 outline-none border border-white/20 focus:border-primary transition"
                />
                {replyText.trim() && (
                  <button
                    type="submit"
                    className="w-10 h-10 rounded-full bg-brand text-primary-foreground flex items-center justify-center shadow-glow cursor-pointer transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </form>

              {/* Private Like Heart Button */}
              <button
                onClick={handleLike}
                className="w-10 h-10 rounded-full glass hover:bg-white/10 flex items-center justify-center text-white transition active:scale-90 cursor-pointer"
                title="Like status"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
              </button>
            </div>
          )}
        </div>

        {/* Viewers Drawer (For Author) */}
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
                <button onClick={() => setShowViewersDrawer(false)} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white">
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

                      {v.has_liked && (
                        <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      )}
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
