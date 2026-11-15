import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceNoteBubbleProps {
  audioUrl: string;
  duration?: number;
  isOwn: boolean;
}

export const VoiceNoteBubble: React.FC<VoiceNoteBubbleProps> = ({ audioUrl, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Mock waveform bars based on hash for aesthetic display
  const bars = [40, 70, 50, 90, 60, 100, 75, 45, 80, 60, 90, 40, 65, 85, 50, 70];

  return (
    <div className="flex items-center gap-3 py-1 min-w-[200px]">
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-90 cursor-pointer ${
          isOwn ? 'bg-white text-teal-700' : 'bg-primary text-[#042f2e]'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Visual Audio Waveform */}
      <div className="flex-1 flex items-center gap-0.5 h-6">
        {bars.map((height, i) => {
          const barPercent = (i / bars.length) * 100;
          const isActive = progress >= barPercent;
          return (
            <div
              key={i}
              style={{ height: `${height}%` }}
              className={`w-1 rounded-full transition-colors ${
                isActive 
                  ? (isOwn ? 'bg-white' : 'bg-primary') 
                  : (isOwn ? 'bg-white/40' : 'bg-white/20')
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};
