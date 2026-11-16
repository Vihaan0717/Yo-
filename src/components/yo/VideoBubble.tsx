import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from 'lucide-react';

interface VideoBubbleProps {
  videoUrl: string;
  isOwn: boolean;
  onOpenFullscreen?: () => void;
}

export const VideoBubble: React.FC<VideoBubbleProps> = ({
  videoUrl,
  isOwn: _isOwn,
  onOpenFullscreen,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Video playback error:', err);
      });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenFullscreen) {
      onOpenFullscreen();
    } else if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      className="relative rounded-2xl overflow-hidden cursor-pointer group select-none border border-white/10 shadow-lg my-1 bg-black/40"
      style={{ maxWidth: '300px' }}
      onClick={togglePlay}
    >
      {/* Loading Skeleton */}
      {!isLoaded && (
        <div className="w-64 h-48 bg-white/5 animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary opacity-60" />
        </div>
      )}

      <video
        ref={videoRef}
        src={videoUrl}
        playsInline
        preload="metadata"
        onLoadedMetadata={() => {
          setIsLoaded(true);
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
          }
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        className={`w-full max-h-[300px] object-cover rounded-2xl transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
        }`}
      />

      {/* Center Big Play/Pause Button on Hover or Paused */}
      {(!isPlaying || isLoaded) && (
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
            isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 bg-black/30'
          }`}
        >
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause video" : "Play video"}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-white text-white" />
            ) : (
              <Play className="w-5 h-5 fill-white text-white translate-x-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Top Floating Controls: Duration badge & Fullscreen button */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 border border-white/10 shadow-sm">
          {isPlaying ? formatTime(currentTime) : (duration > 0 ? formatTime(duration) : 'Video')}
        </span>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 text-white/90 border border-white/10 transition-colors shadow-sm"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleFullscreen}
            aria-label="Fullscreen"
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 text-white/90 border border-white/10 transition-colors shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};
