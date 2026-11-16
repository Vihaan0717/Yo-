import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Film, 
  Lock, 
  Archive, 
  Trash2, 
  ChevronRight,
  Bell
} from 'lucide-react';
import { Avatar } from '../yo/Avatar';
import type { Chat } from '../yo/YoApp';
import { HapticsService } from '../../services/feedback/HapticsService';
import { SoundEffectsService } from '../../services/feedback/SoundEffectsService';

export interface ChatMediaItem {
  id: string;
  type: 'image' | 'video' | 'file';
  url: string;
  thumbnail?: string;
  name?: string;
  size?: string;
  time?: string;
}

interface ChatContactInfoDrawerProps {
  isOpen: boolean;
  chat: Chat;
  messages: Array<any>;
  isLocked?: boolean;
  isArchived?: boolean;
  onClose: () => void;
  onToggleLock?: () => void;
  onToggleArchive?: () => void;
  onClearChat?: () => void;
  onOpenNotifications?: () => void;
  onOpenMedia?: (media: ChatMediaItem) => void;
}

export const ChatContactInfoDrawer: React.FC<ChatContactInfoDrawerProps> = ({
  isOpen,
  chat,
  messages,
  isLocked = false,
  isArchived = false,
  onClose,
  onToggleLock,
  onToggleArchive,
  onClearChat,
  onOpenNotifications,
  onOpenMedia
}) => {
  if (!isOpen) return null;

  // Extract shared media items from this conversation's messages
  const mediaItems: ChatMediaItem[] = messages
    .filter((m) => m.image_url || m.video_url || m.file_url)
    .map((m) => {
      const itemType: 'image' | 'video' | 'file' = m.image_url ? 'image' : m.video_url ? 'video' : 'file';
      return {
        id: String(m.id),
        type: itemType,
        url: m.image_url || m.video_url || m.file_url,
        name: m.file_name,
        size: m.file_size,
        time: m.time
      };
    })
    .reverse();

  const photosAndVideos = mediaItems.filter((i) => i.type === 'image' || i.type === 'video');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* iOS WhatsApp-Style Contact & Media Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="relative w-full max-w-md h-full bg-[#0b0f19] text-white border-l border-white/10 flex flex-col z-10 overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="glass-strong px-4 py-3.5 flex items-center justify-between border-b border-white/10 shrink-0">
            <span className="font-bold text-base tracking-tight">Contact Info</span>
            <button
              onClick={() => {
                HapticsService.light();
                onClose();
              }}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5 pb-10">
            {/* Contact Hero Section */}
            <div className="flex flex-col items-center py-6 px-4 bg-gradient-to-b from-white/5 to-transparent">
              <Avatar chat={chat} size={92} />
              <h2 className="text-xl font-bold mt-3 text-center">{chat.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{chat.handle || 'Yo User'}</p>
              {chat.online && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              )}
            </div>

            {/* Media, Links & Docs Grid Section (WhatsApp-Exact) */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Media, links, and docs
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  {mediaItems.length} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {photosAndVideos.length > 0 ? (
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {photosAndVideos.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        HapticsService.light();
                        onOpenMedia?.(item);
                      }}
                      className="aspect-square rounded-xl overflow-hidden glass border border-white/10 relative group cursor-pointer hover:border-teal-400/50 transition-all"
                    >
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.url} alt="media" className="w-full h-full object-cover" />
                      )}
                      {item.type === 'video' && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Film className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400 glass rounded-2xl p-4">
                  No media shared in this chat yet
                </div>
              )}
            </div>

            {/* Privacy & Organization Settings Rows */}
            <div className="py-2">
              {/* Notification Tones & Voice Alert */}
              <button
                onClick={() => {
                  HapticsService.light();
                  SoundEffectsService.playTap();
                  onOpenNotifications?.();
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-300 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Custom Notifications</div>
                    <div className="text-xs text-slate-400">Tone, voice rules & mute</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* Chat Lock (WhatsApp Style) */}
              <div className="px-4 py-3 flex items-center justify-between hover:bg-white/5 transition text-left">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-300 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Lock Chat</div>
                    <div className="text-xs text-slate-400">Hide & protect with passcode</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    HapticsService.medium();
                    onToggleLock?.();
                  }}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isLocked ? 'bg-teal-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      isLocked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Archive Conversation */}
              <button
                onClick={() => {
                  HapticsService.light();
                  onToggleArchive?.();
                }}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-300 flex items-center justify-center">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {isArchived ? 'Unarchive Chat' : 'Archive Chat'}
                    </div>
                    <div className="text-xs text-slate-400">Move out of main inbox</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400 font-semibold">
                  {isArchived ? 'Archived' : 'Active'}
                </span>
              </button>
            </div>

            {/* Destructive Actions */}
            <div className="py-2">
              <button
                onClick={() => {
                  HapticsService.heavy();
                  onClearChat?.();
                }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-500/10 text-red-400 transition cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">Clear Chat</div>
                  <div className="text-xs text-red-400/70">Delete messages on this device</div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
