import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  ShieldCheck, 
  Copy, 
  Check
} from 'lucide-react';
import { Avatar } from '../yo/Avatar';
import type { Profile } from '../../types';
import { HapticsService } from '../../services/feedback/HapticsService';

interface ProfileViewerModalProps {
  isOpen: boolean;
  user: Profile | null;
  onClose: () => void;
  onUpdateAvatar?: (url: string) => void;
}

export const ProfileViewerModal: React.FC<ProfileViewerModalProps> = ({
  isOpen,
  user,
  onClose,
  onUpdateAvatar
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  if (!isOpen || !user) return null;

  const copyHandle = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopied(true);
    HapticsService.light();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSavePhoto = () => {
    if (newPhotoUrl.trim()) {
      onUpdateAvatar?.(newPhotoUrl.trim());
      setIsEditingPhoto(false);
      HapticsService.success();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="glass-panel w-full max-w-sm rounded-3xl p-6 relative overflow-hidden border border-white/10 shadow-2xl bg-[#0e1524]/90"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Profile Photo Header */}
          <div className="flex flex-col items-center pt-2 pb-4">
            <div className="relative group">
              <Avatar
                chat={{ name: user.display_name, hue: 210, avatar_url: user.avatar_url }}
                size={110}
              />
              <button
                onClick={() => setIsEditingPhoto(!isEditingPhoto)}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-brand text-primary-foreground shadow-glow hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-xl font-black text-white mt-4">{user.display_name}</h3>
            
            <button
              onClick={copyHandle}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass border border-white/10 text-xs font-semibold text-teal-300 mt-1.5 hover:bg-white/10 transition cursor-pointer"
            >
              <span>@{user.username}</span>
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>

          {/* Edit photo URL input drawer */}
          <AnimatePresence>
            {isEditingPhoto && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="glass rounded-2xl p-3 border border-teal-500/30 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-300">Avatar Image URL</label>
                  <input
                    type="url"
                    value={newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="glass w-full px-3 py-2 rounded-xl text-xs text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setIsEditingPhoto(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePhoto}
                      className="px-3.5 py-1 text-xs font-bold rounded-lg bg-brand text-primary-foreground shadow-glow cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Info Details List */}
          <div className="space-y-2.5 pt-2">
            <div className="glass rounded-2xl p-3 border border-white/5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                About / Status
              </span>
              <p className="text-xs text-slate-200">
                {user.status_status || user.bio || 'Hey there! I am using Yo!!!'}
              </p>
            </div>

            <div className="glass rounded-2xl p-3 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-0.5">
                  Permanent Yo!!! ID
                </span>
                <span className="text-xs font-mono text-slate-300">
                  {user.id ? `${user.id.slice(0, 14)}...` : 'N/A'}
                </span>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
