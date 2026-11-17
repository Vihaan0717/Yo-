import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Image as ImageIcon, 
  Film, 
  Type, 
  Sparkles, 
  Send, 
  Loader2, 
  Mic, 
  Square,
  ShieldCheck
} from 'lucide-react';
import { ImageService } from '../../../services/media/ImageService';
import { VoiceRecorderService } from '../../../services/voice/VoiceRecorderService';
import { StatusService } from '../services/StatusService';
import { StatusPrivacyModal } from './StatusPrivacyModal';
import type { StatusContentType, StatusAudienceMode } from '../types/status';

interface AddStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialMode?: StatusContentType;
  userProfile?: { display_name: string; username: string; avatar_url?: string };
  onStatusCreated: () => void;
}

const GRADIENTS = [
  'from-teal-600 to-cyan-800',
  'from-purple-600 to-indigo-800',
  'from-rose-600 to-orange-700',
  'from-blue-600 to-violet-800',
  'from-emerald-600 to-teal-800',
  'from-slate-900 to-zinc-800'
];

export const AddStatusModal: React.FC<AddStatusModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialMode = 'text',
  userProfile,
  onStatusCreated
}) => {
  const [mode, setMode] = useState<StatusContentType>(initialMode);
  const [textContent, setTextContent] = useState('');
  const [gradientIndex, setGradientIndex] = useState(0);
  const [mediaDataUrl, setMediaDataUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [audienceMode, setAudienceMode] = useState<StatusAudienceMode>('contacts');
  const [audienceUserIds, setAudienceUserIds] = useState<string[]>([]);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const recorderRef = useRef<VoiceRecorderService | null>(null);
  const timerRef = useRef<any>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      StatusService.getPreferences(userId).then((prefs) => {
        setAudienceMode(prefs.default_audience_mode || 'contacts');
      });
      if (initialMode === 'image') {
        setTimeout(() => photoInputRef.current?.click(), 100);
      }
    }
  }, [isOpen, initialMode, userId]);

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

  const startVoiceRecording = async () => {
    try {
      const rec = new VoiceRecorderService();
      await rec.start();
      recorderRef.current = rec;
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      alert("Could not access microphone.");
    }
  };

  const stopVoiceRecording = async () => {
    if (!recorderRef.current) return;
    clearInterval(timerRef.current);
    try {
      const base64 = await recorderRef.current.stop();
      setIsRecording(false);
      setAudioBlobUrl(base64);
    } catch (e) {
      console.warn('Voice recording stop error:', e);
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'text' && !textContent.trim()) return;
    if ((mode === 'image' || mode === 'video') && !mediaDataUrl) return;
    if (mode === 'audio' && !audioBlobUrl) return;

    setIsSubmitting(true);
    try {
      await StatusService.publishStatus({
        userId,
        userProfile,
        contentType: mode,
        textContent: mode === 'text' ? textContent.trim() : undefined,
        mediaPath: mode === 'audio' ? audioBlobUrl! : (mediaDataUrl || undefined),
        caption: mode === 'text' ? textContent.trim() : caption.trim(),
        audienceMode,
        audienceUserIds,
        metadata: {
          bgGradient: GRADIENTS[gradientIndex],
          audioDurationSec: mode === 'audio' ? recordSeconds : undefined
        }
      });

      onStatusCreated();
      onClose();
    } catch (e) {
      console.error('Failed to post status:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAudienceLabel = () => {
    if (audienceMode === 'contacts') return 'My Contacts';
    if (audienceMode === 'except') return `Excluded (${audienceUserIds.length})`;
    return `Only (${audienceUserIds.length})`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-sm h-[82vh] max-h-[620px] rounded-[32px] glass-strong border border-white/20 overflow-hidden flex flex-col justify-between shadow-2xl bg-[#0b0f19]"
      >
        <input type="file" ref={photoInputRef} accept="image/*" className="hidden" onChange={handlePhotoSelect} />
        <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={handleVideoSelect} />

        {/* Top Header */}
        <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/10 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Status</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrivacyModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full glass hover:bg-white/15 text-white/80 text-[10px] font-semibold border border-white/20 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>{getAudienceLabel()}</span>
            </button>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden mx-3 my-2 rounded-2xl border border-white/10">
          {mode === 'text' ? (
            <div className={`w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br ${GRADIENTS[gradientIndex]} transition-colors duration-300`}>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type your status..."
                maxLength={200}
                className="w-full bg-transparent text-white text-center text-lg font-bold placeholder:text-white/60 outline-none resize-none"
                rows={4}
              />
              <span className="text-[10px] text-white/60 mt-2">{textContent.length} / 200</span>
            </div>
          ) : mode === 'audio' ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-rose-950/80 via-slate-900 to-zinc-950">
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-3 shadow-glow">
                <Mic className={`w-7 h-7 ${isRecording ? 'animate-pulse text-rose-500' : ''}`} />
              </div>
              <p className="text-xs font-bold text-white mb-1">
                {isRecording ? `Recording voice status... ${recordSeconds}s` : (audioBlobUrl ? 'Voice note ready!' : 'Record Voice Status')}
              </p>
              <p className="text-[10px] text-white/50 mb-3">Up to 60 seconds</p>

              {!isRecording && !audioBlobUrl ? (
                <button
                  onClick={startVoiceRecording}
                  className="px-4 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs shadow-lg transition cursor-pointer"
                >
                  Start Recording
                </button>
              ) : isRecording ? (
                <button
                  onClick={stopVoiceRecording}
                  className="px-4 py-2 rounded-full bg-white text-black font-semibold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-black" />
                  <span>Done</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAudioBlobUrl(null);
                    startVoiceRecording();
                  }}
                  className="px-3.5 py-1.5 rounded-xl glass hover:bg-white/10 text-white text-xs cursor-pointer"
                >
                  Re-record
                </button>
              )}
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

          {/* Optional Caption */}
          {(mode === 'image' || mode === 'video') && mediaDataUrl && (
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

        {/* Bottom Toolbar & Publish */}
        <div className="relative z-20 px-3 py-2.5 border-t border-white/10 flex items-center justify-between gap-2 shrink-0 bg-black/40">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                setMode('text');
                setMediaDataUrl(null);
              }}
              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                mode === 'text' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Text</span>
            </button>

            {mode === 'text' && (
              <button
                onClick={() => setGradientIndex((prev) => (prev + 1) % GRADIENTS.length)}
                className="p-1.5 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition cursor-pointer shrink-0"
              >
                🎨 Color
              </button>
            )}

            <button
              onClick={() => photoInputRef.current?.click()}
              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                mode === 'image' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Photo</span>
            </button>

            <button
              onClick={() => videoInputRef.current?.click()}
              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                mode === 'video' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Video</span>
            </button>

            <button
              onClick={() => {
                setMode('audio');
                setMediaDataUrl(null);
              }}
              className={`p-1.5 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ${
                mode === 'audio' ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/70'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (mode === 'text' && !textContent.trim()) ||
              ((mode === 'image' || mode === 'video') && !mediaDataUrl) ||
              (mode === 'audio' && !audioBlobUrl)
            }
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-brand text-primary-foreground font-semibold text-xs shadow-glow disabled:opacity-40 cursor-pointer transition shrink-0 ml-1"
          >
            {isSubmitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Embedded Audience Privacy Override Modal */}
      <StatusPrivacyModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        userId={userId}
        temporaryOverride={true}
        onSaved={(newMode, newIds) => {
          setAudienceMode(newMode);
          setAudienceUserIds(newIds);
        }}
      />
    </div>
  );
};
