import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Camera, 
  Copy, 
  Check, 
  Pencil, 
  User, 
  Smile, 
  AtSign, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { Avatar } from '../yo/Avatar';
import type { Profile } from '../../types';
import { HapticsService } from '../../services/feedback/HapticsService';
import { SoundEffectsService } from '../../services/feedback/SoundEffectsService';
import { ImageService } from '../../services/media/ImageService';

interface ProfileViewerModalProps {
  isOpen: boolean;
  user: Profile | null;
  onClose: () => void;
  onUpdateAvatar?: (url: string) => Promise<void> | void;
  onUpdateName?: (name: string) => Promise<void> | void;
  onUpdateAbout?: (about: string) => Promise<void> | void;
}

const WHATSAPP_STATUS_PRESETS = [
  'Available',
  'Busy',
  'At school',
  'At the movies',
  'At work',
  'Battery about to die',
  "Can't talk, Yo!!! only",
  'In a meeting',
  'At the gym',
  'Sleeping',
  'Urgent calls only'
];

export const ProfileViewerModal: React.FC<ProfileViewerModalProps> = ({
  isOpen,
  user,
  onClose,
  onUpdateAvatar,
  onUpdateName,
  onUpdateAbout
}) => {
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  // About editing
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !user) return null;

  const handleCopyHandle = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopied(true);
    SoundEffectsService.playTap();
    HapticsService.light();
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePickPhoto = () => {
    SoundEffectsService.playTap();
    HapticsService.light();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // High-quality client-side compression to lightweight WebP/JPEG (max 512px for avatars)
      const processed = await ImageService.processImageFile(file, 512, 0.85);
      await onUpdateAvatar?.(processed.dataUrl);
      SoundEffectsService.playFavorite();
      HapticsService.success();
    } catch (err) {
      console.error('Failed to process image:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    SoundEffectsService.playDelete();
    HapticsService.medium();
    await onUpdateAvatar?.('');
  };

  const handleStartEditName = () => {
    setNameDraft(user.display_name || '');
    setIsEditingName(true);
    SoundEffectsService.playTap();
    HapticsService.light();
  };

  const handleSaveName = async () => {
    if (nameDraft.trim() && nameDraft.trim() !== user.display_name) {
      await onUpdateName?.(nameDraft.trim());
      SoundEffectsService.playToggleOn();
      HapticsService.success();
    }
    setIsEditingName(false);
  };

  const handleStartEditAbout = () => {
    setAboutDraft(user.status_status || user.bio || 'Hey there! I am using Yo!!!');
    setIsEditingAbout(true);
    SoundEffectsService.playTap();
    HapticsService.light();
  };

  const handleSaveAbout = async (customVal?: string) => {
    const valToSave = customVal !== undefined ? customVal : aboutDraft;
    if (valToSave.trim()) {
      await onUpdateAbout?.(valToSave.trim());
      SoundEffectsService.playToggleOn();
      HapticsService.success();
    }
    setIsEditingAbout(false);
  };

  const handleSelectPreset = async (preset: string) => {
    setAboutDraft(preset);
    await handleSaveAbout(preset);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="glass-strong w-full max-w-sm rounded-[32px] p-6 relative overflow-hidden border border-border shadow-2xl bg-card text-card-foreground max-h-[92vh] flex flex-col justify-between"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border/40">
            <h3 className="text-lg font-bold text-foreground">Profile</h3>
            <button
              onClick={() => {
                SoundEffectsService.playDrawerClose();
                HapticsService.light();
                onClose();
              }}
              className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto space-y-4 py-3 flex-1 pr-0.5">
            {/* Profile Photo Section (WhatsApp Style) */}
            <div className="flex flex-col items-center pt-2">
              <div 
                onClick={handlePickPhoto}
                className="relative group cursor-pointer"
                title="Tap anywhere to change profile photo from gallery"
              >
                <Avatar
                  chat={{ name: user.display_name, hue: 210, avatar_url: user.avatar_url }}
                  size={104}
                  onClick={handlePickPhoto}
                />

                {/* Camera badge to choose from Gallery / Camera */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePickPhoto();
                  }}
                  disabled={isUploading}
                  className="absolute bottom-0 right-0 p-2.5 rounded-full bg-primary text-primary-foreground shadow-glow hover:scale-105 active:scale-95 transition-transform cursor-pointer border-2 border-card"
                  title="Choose from gallery"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>

                {/* Hidden native image file picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Photo action pills */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handlePickPhoto}
                  disabled={isUploading}
                  className="px-3 py-1 rounded-full text-xs font-semibold glass border border-border text-primary hover:bg-primary/10 transition cursor-pointer"
                >
                  Choose photo
                </button>
                {Boolean(user.avatar_url) && (
                  <button
                    onClick={handleRemovePhoto}
                    className="px-3 py-1 rounded-full text-xs font-semibold glass border border-destructive/30 text-destructive hover:bg-destructive/10 transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            </div>

            {/* Name Section (WhatsApp style with edit pencil & disclaimer) */}
            <div className="glass rounded-2xl p-3.5 border border-border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-primary">
                  <User className="w-4 h-4" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Name
                  </span>
                </div>
                {!isEditingName && (
                  <button
                    onClick={handleStartEditName}
                    className="p-1 rounded-lg text-primary hover:bg-primary/10 transition cursor-pointer"
                    title="Edit Name"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isEditingName ? (
                <div className="space-y-2 mt-2">
                  <input
                    type="text"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={32}
                    className="w-full px-3 py-2 rounded-xl text-sm bg-secondary text-foreground outline-none border border-primary/40 focus:border-primary"
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveName}
                      className="px-3.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-glow cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-base font-bold text-foreground">
                  {user.display_name}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                This is not your username or pin. This name will be visible to your Yo!!! contacts.
              </p>
            </div>

            {/* About Section (WhatsApp Style) */}
            <div className="glass rounded-2xl p-3.5 border border-border">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-primary">
                  <Smile className="w-4 h-4" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    About
                  </span>
                </div>
                {!isEditingAbout && (
                  <button
                    onClick={handleStartEditAbout}
                    className="p-1 rounded-lg text-primary hover:bg-primary/10 transition cursor-pointer"
                    title="Edit About"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {isEditingAbout ? (
                <div className="space-y-2.5 mt-2">
                  <div>
                    <input
                      type="text"
                      value={aboutDraft}
                      onChange={(e) => setAboutDraft(e.target.value)}
                      maxLength={139}
                      className="w-full px-3 py-2 rounded-xl text-xs bg-secondary text-foreground outline-none border border-primary/40 focus:border-primary"
                      placeholder="Write your bio..."
                      autoFocus
                    />
                    <div className="text-right text-[10px] text-muted-foreground mt-0.5">
                      {139 - aboutDraft.length}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsEditingAbout(false)}
                      className="px-3 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:bg-secondary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveAbout()}
                      className="px-3.5 py-1 rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow-glow cursor-pointer"
                    >
                      Save
                    </button>
                  </div>

                  {/* Standard WhatsApp Status Presets */}
                  <div className="pt-2 border-t border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                      Select About
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {WHATSAPP_STATUS_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handleSelectPreset(preset)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-primary/10 transition-colors flex items-center justify-between text-foreground cursor-pointer"
                        >
                          <span>{preset}</span>
                          {user.status_status === preset && (
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-foreground font-medium">
                  {user.status_status || user.bio || 'Hey there! I am using Yo!!!'}
                </div>
              )}
            </div>

            {/* Username Section (WhatsApp Handle with Copy) */}
            <div className="glass rounded-2xl p-3.5 border border-border flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary mb-1">
                  <AtSign className="w-4 h-4" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Username
                  </span>
                </div>
                <div className="text-sm font-semibold text-primary">
                  @{user.username}
                </div>
              </div>

              <button
                onClick={handleCopyHandle}
                className="p-2 rounded-xl glass border border-border text-foreground hover:bg-secondary transition cursor-pointer flex items-center gap-1.5 text-xs font-medium"
                title="Copy username"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-accent" />
                    <span className="text-accent text-[11px] font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Bottom dismiss button */}
          <div className="pt-2 border-t border-border/40">
            <button
              onClick={() => {
                SoundEffectsService.playDrawerClose();
                HapticsService.light();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 active:scale-98 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
