import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceNoteBubbleProps {
  audioUrl: string;
  duration?: number;
  isOwn: boolean;
}

export const VoiceNoteBubble: React.FC<VoiceNoteBubbleProps> = ({ audioUrl, isOwn }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // Generate deterministic dynamic waveform bars from audioUrl hash
  const waveformBars = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < audioUrl.length; i++) {
      hash = (hash << 5) - hash + audioUrl.charCodeAt(i);
      hash |= 0;
    }
    const barCount = 28;
    const bars: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const pseudo = Math.abs(Math.sin((hash + i * 17) * 0.45));
      const height = Math.round(25 + pseudo * 70); // 25% to 95% height
      bars.push(height);
    }
    return bars;
  }, [audioUrl]);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.playbackRate = playbackRate;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
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
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.warn);
    }
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextRate: 1 | 1.5 | 2 = playbackRate === 1 ? 1.5 : (playbackRate === 1.5 ? 2 : 1);
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleWaveformSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!waveformRef.current || !audioRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = clickX / rect.width;
    const seekTime = (totalDuration || audioRef.current.duration || 0) * percentage;
    if (!isNaN(seekTime)) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const formatAudioTime = (sec: number) => {
    if (isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col gap-1 py-1 min-w-[220px] max-w-[280px] select-none">
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all active:scale-90 cursor-pointer ${
            isOwn 
              ? 'bg-white text-[#042f2e] hover:bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.2)]' 
              : 'bg-primary text-[#042f2e] hover:bg-primary/90 shadow-[0_2px_8px_rgba(45,212,191,0.3)]'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Interactive Scrubbing Waveform */}
        <div
          ref={waveformRef}
          onClick={handleWaveformSeek}
          className="flex-1 flex items-center gap-[2.5px] h-8 cursor-pointer py-1 relative group"
          title="Click to scrub"
        >
          {waveformBars.map((height, i) => {
            const barPercent = (i / waveformBars.length) * 100;
            const isPlayed = progressPercent >= barPercent;
            return (
              <div
                key={i}
                style={{ height: `${height}%` }}
                className={`w-[3px] rounded-full transition-all duration-75 group-hover:opacity-100 ${
                  isPlayed
                    ? (isOwn ? 'bg-white shadow-[0_0_4px_rgba(255,255,255,0.4)]' : 'bg-[#2dd4bf] shadow-[0_0_4px_rgba(45,212,191,0.5)]')
                    : (isOwn ? 'bg-white/35' : 'bg-white/20')
                }`}
              />
            );
          })}
        </div>

        {/* Speed Multiplier Pill (1x / 1.5x / 2x) */}
        <button
          onClick={cyclePlaybackRate}
          title={`Playback speed: ${playbackRate}x (tap to switch)`}
          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-tight transition-all active:scale-95 cursor-pointer border ${
            isOwn
              ? 'bg-black/20 text-white/90 border-white/20 hover:bg-black/30'
              : 'glass text-slate-200 border-white/10 hover:bg-white/10'
          }`}
        >
          {playbackRate}x
        </button>
      </div>

      {/* Audio Timer HUD */}
      <div className={`flex items-center justify-between text-[10px] px-1 font-mono tracking-tight ${
        isOwn ? 'text-primary-foreground/75' : 'text-muted-foreground'
      }`}>
        <span>{formatAudioTime(currentTime)}</span>
        <span>{totalDuration > 0 ? formatAudioTime(totalDuration) : '--:--'}</span>
      </div>
    </div>
  );
};
