import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Film, 
  Lock, 
  Archive, 
  Trash2, 
  ChevronRight,
  Bell,
  Phone,
  Video,
  Search,
  Heart,
  Star,
  Timer,
  ShieldCheck,
  Ban,
  Flag
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
  isFavorite?: boolean;
  onClose: () => void;
  onToggleLock?: () => void;
  onToggleArchive?: () => void;
  onToggleFavorite?: () => void;
  onStartAudioCall?: () => void;
  onStartVideoCall?: () => void;
  onSearchInChat?: () => void;
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
  isFavorite = false,
  onClose,
  onToggleLock,
  onToggleArchive,
  onToggleFavorite,
  onStartAudioCall,
  onStartVideoCall,
  onSearchInChat,
  onClearChat,
  onOpenNotifications,
  onOpenMedia
}) => {
  const [blocked, setBlocked] = useState(false);
  const isGroup = chat.type === 'group';

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

  const Row = ({ 
    icon: Icon, 
    label, 
    sub, 
    right, 
    danger, 
    onClick 
  }: { 
    icon: any; 
    label: string; 
    sub?: string; 
    right?: React.ReactNode; 
    danger?: boolean; 
    onClick?: () => void; 
  }) => (
    <button 
      onClick={() => {
        HapticsService.light();
        onClick?.();
      }} 
      className={`flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-white/5 cursor-pointer ${
        danger ? "text-destructive" : "text-foreground"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${danger ? "text-destructive" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium leading-tight">{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      {right ?? (!danger && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />)}
    </button>
  );

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

        {/* WhatsApp & Glasswave Contact Info Sheet */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 360 }}
          className="relative w-full max-w-md h-full bg-background text-foreground border-l border-border flex flex-col z-10 overflow-hidden shadow-2xl"
        >
          {/* Sticky Header with Back Chevron */}
          <div className="glass-strong px-3 py-3 flex items-center justify-between border-b border-border shrink-0">
            <button
              onClick={() => {
                HapticsService.light();
                onClose();
              }}
              aria-label="Back"
              className="flex items-center text-primary cursor-pointer active:scale-90 transition-transform p-1"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <span className="font-semibold text-base tracking-tight text-foreground">
              {isGroup ? "Group info" : "Contact info"}
            </span>
            <div className="w-7" />
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto pb-10 space-y-4 px-4 pt-4">
            {/* Hero Profile Photo & Identity */}
            <div className="flex flex-col items-center pt-2 pb-3">
              <motion.div 
                initial={{ scale: 0.7, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              >
                <Avatar chat={chat} size={112} />
              </motion.div>
              <h2 className="mt-3.5 text-2xl font-bold tracking-tight text-center">{chat.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{chat.handle || 'Yo User'}</p>
              {chat.online && (
                <span className="inline-flex items-center gap-1.5 text-xs text-accent font-medium mt-1">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  Online
                </span>
              )}

              {/* 4 Quick Action Pills (WhatsApp & Glasswave Pattern) */}
              <div className="mt-5 grid w-full grid-cols-4 gap-2">
                {[
                  { 
                    icon: Phone, 
                    label: "Audio", 
                    onClick: () => {
                      onClose();
                      onStartAudioCall?.();
                    } 
                  },
                  { 
                    icon: Video, 
                    label: "Video", 
                    onClick: () => {
                      onClose();
                      onStartVideoCall?.();
                    } 
                  },
                  { 
                    icon: Search, 
                    label: "Search", 
                    onClick: () => {
                      onClose();
                      onSearchInChat?.();
                    } 
                  },
                  { 
                    icon: Heart, 
                    label: isFavorite ? "Favorited" : "Favorite", 
                    active: isFavorite, 
                    onClick: () => {
                      HapticsService.medium();
                      onToggleFavorite?.();
                    } 
                  }
                ].map((act) => (
                  <motion.button
                    key={act.label}
                    whileTap={{ scale: 0.9 }}
                    onClick={act.onClick}
                    className="glass flex flex-col items-center gap-1.5 rounded-2xl py-3 text-xs font-semibold cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <act.icon className={`h-5 w-5 text-primary ${act.active ? "fill-primary text-primary" : ""}`} />
                    <span className="text-[11px] text-foreground">{act.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* About / Description Card */}
            <div className="glass rounded-3xl p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                {isGroup ? "Description" : "About"}
              </div>
              <div className="text-[15px] font-medium text-foreground">
                {isGroup ? "Group conversation in Yo!!!" : "Hey there! I'm using Yo!!!"}
              </div>
            </div>

            {/* Media, Links & Docs Grid Section (WhatsApp-Exact with Previews) */}
            <div className="glass overflow-hidden rounded-3xl">
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Media, links, and docs
                </span>
                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                  {mediaItems.length} <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {photosAndVideos.length > 0 ? (
                <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4 pb-4 pt-1">
                  {photosAndVideos.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        HapticsService.light();
                        onOpenMedia?.(item);
                      }}
                      className="h-20 w-20 shrink-0 rounded-2xl overflow-hidden glass border border-white/10 relative group cursor-pointer hover:border-primary transition-all"
                    >
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={item.url} alt="media" className="w-full h-full object-cover" />
                      )}
                      {item.type === 'video' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Film className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 pb-4 pt-1 text-xs text-muted-foreground">
                  No media shared in this chat yet.
                </div>
              )}
            </div>

            {/* Privacy & Settings Grouped Card */}
            <div className="glass divide-y divide-border overflow-hidden rounded-3xl">
              <Row 
                icon={Star} 
                label="Starred messages" 
                right={<span className="text-xs text-muted-foreground">0</span>} 
              />
              <Row 
                icon={Bell} 
                label="Custom notifications" 
                sub="Tone, voice rules & mute" 
                onClick={onOpenNotifications} 
              />
              <Row 
                icon={Timer} 
                label="Disappearing messages" 
                sub="Off" 
              />
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3.5">
                  <Lock className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="text-[14px] font-medium leading-tight">Chat lock</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Lock and hide this chat</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    HapticsService.medium();
                    SoundEffectsService.playTap();
                    onToggleLock?.();
                  }}
                  className={`flex h-7 w-12 rounded-full p-0.5 transition-colors cursor-pointer ${
                    isLocked ? "bg-accent justify-end" : "bg-secondary justify-start"
                  }`}
                >
                  <motion.span layout className="h-6 w-6 rounded-full bg-foreground shadow-glow" />
                </button>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3.5">
                  <Archive className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <div className="text-[14px] font-medium leading-tight">Archive chat</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Move to archived chats</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    HapticsService.medium();
                    SoundEffectsService.playTap();
                    onToggleArchive?.();
                  }}
                  className={`flex h-7 w-12 rounded-full p-0.5 transition-colors cursor-pointer ${
                    isArchived ? "bg-accent justify-end" : "bg-secondary justify-start"
                  }`}
                >
                  <motion.span layout className="h-6 w-6 rounded-full bg-foreground shadow-glow" />
                </button>
              </div>
              <Row 
                icon={ShieldCheck} 
                label="Encryption" 
                sub="Messages are end-to-end encrypted" 
              />
            </div>

            {/* Destructive Actions Grouped Card */}
            <div className="glass divide-y divide-border overflow-hidden rounded-3xl">
              {!isGroup && (
                <Row 
                  icon={Ban} 
                  danger 
                  label={blocked ? `Unblock ${chat.name}` : `Block ${chat.name}`} 
                  onClick={() => setBlocked(!blocked)} 
                />
              )}
              <Row 
                icon={Flag} 
                danger 
                label={isGroup ? "Report group" : `Report ${chat.name}`} 
              />
              <Row 
                icon={Trash2} 
                danger 
                label={isGroup ? "Exit group" : "Clear chat"} 
                onClick={() => {
                  HapticsService.heavy();
                  onClearChat?.();
                }} 
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
