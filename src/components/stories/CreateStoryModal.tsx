import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Image as ImageIcon, Film, Type, Sparkles, Send, Loader2 } from 'lucide-react';
import { ImageService } from '../../services/media/ImageService';
import { StoryService, type StoryMediaType } from '../../services/stories/StoryService';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialMode?: StoryMediaType;
  userProfile?: { display_name: string; username: string; avatar_url?: string };
  onStoryCreated: () => void;
}

const GRADIENTS = [
  'from-teal-600 to-cyan-800',
  'from-purple-600 to-indigo-800',
  'from-rose-600 to-orange-700',
  'from-blue-600 to-violet-800',
  'from-emerald-600 to-teal-800'
];

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialMode = 'text',
  userProfile,
  onStoryCreated
}) => {
  const [mode, setMode] = useState<StoryMediaType>(initialMode);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      if (initialMode === 'image') {
        setTimeout(() => photoInputRef.current?.click(), 100);
      }
    }
  }, [isOpen, initialMode]);
  const [textContent, setTextContent] = useState('');
  const [gradientIndex, setGradientIndex] = useState(0);
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const processed = await ImageService.processImageFile(file, 1280, 0.85);
      setMediaDataUrl(processed.dataUrl);
      setMode('image');
    } catch (err) {
      console.warn('Error reading photo:', err);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      alert("Please select a video under 25MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaDataUrl(event.target?.result as string);
      setMode('video');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (mode === 'text' && !textContent.trim()) return;
    if ((mode === 'image' || mode === 'video') && !mediaDataUrl) return;

    setIsSubmitting(true);
    try {
      await StoryService.createStory({
        userId,
        userProfile,
        mediaType: mode,
        mediaUrl: mode === 'text' ? textContent.trim() : (mediaDataUrl || ''),
        caption: mode === 'text' ? textContent.trim() : caption.trim(),
        bgGradient: GRADIENTS[gradientIndex]
      });

      onStoryCreated();
      onClose();
    } catch (e) {
      console.error('Failed to post story:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md h-[580px] rounded-3xl glass-strong border border-white/20 overflow-hidden flex flex-col justify-between shadow-2xl"
      >
        {/* Hidden inputs */}
        <input 
          type="file" 
          ref={photoInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handlePhotoSelect} 
        />
        <input 
          type="file" 
          ref={videoInputRef} 
          accept="video/*" 
          className="hidden" 
          onChange={handleVideoSelect} 
        />

        {/* Top Header */}
        <div className="relative z-20 flex items-center justify-between p-4 pb-2 border-b border-white/10 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">New 24h Status / Story</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Canvas Area */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden m-3 rounded-2xl border border-white/10">
          {mode === 'text' ? (
            <div className={`w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br ${GRADIENTS[gradientIndex]} transition-colors duration-300`}>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your story status..."
                maxLength={200}
                className="w-full bg-transparent text-white text-center text-lg md:text-xl font-bold placeholder:text-white/60 outline-none resize-none"
                rows={4}
              />
              <span className="text-[10px] text-white/60 mt-2">{textContent.length} / 200</span>
            </div>
          ) : mode === 'video' && mediaDataUrl ? (
            <video src={mediaDataUrl} autoPlay playsInline muted loop className="w-full h-full object-cover" />
          ) : mediaDataUrl ? (
            <img src={mediaDataUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4 text-white/60 text-xs">
              Select a photo or video using the controls below
            </div>
          )}

          {/* Optional Caption for Image / Video */}
          {mode !== 'text' && mediaDataUrl && (
            <div className="absolute bottom-3 inset-x-3">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full glass text-white text-xs px-3.5 py-2 rounded-full outline-none border border-white/20"
              />
            </div>
          )}
        </div>

        {/* Bottom Mode Picker & Action Bar */}
        <div className="relative z-20 p-3 pt-1 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMode('text');
                setMediaDataUrl(null);
              }}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'text' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
            </button>

            {mode === 'text' && (
              <button
                onClick={() => setGradientIndex((prev) => (prev + 1) % GRADIENTS.length)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition cursor-pointer"
                title="Change Color Gradient"
              >
                🎨 Color
              </button>
            )}

            <button
              onClick={() => photoInputRef.current?.click()}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'image' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Photo</span>
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                mode === 'video' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Video</span>
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || (mode === 'text' && !textContent.trim()) || (mode !== 'text' && !mediaDataUrl)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-brand text-primary-foreground font-semibold text-xs shadow-glow disabled:opacity-40 cursor-pointer transition"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
