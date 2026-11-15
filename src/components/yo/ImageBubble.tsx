import React, { useState } from 'react';
import { Maximize2, Loader2 } from 'lucide-react';

interface ImageBubbleProps {
  imageUrl: string;
  caption?: string;
  isOwn: boolean;
  onOpenLightbox: () => void;
}

export const ImageBubble: React.FC<ImageBubbleProps> = ({
  imageUrl,
  caption,
  isOwn,
  onOpenLightbox,
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div 
      onClick={(e) => {
        e.stopPropagation();
        onOpenLightbox();
      }}
      className="relative rounded-2xl overflow-hidden cursor-pointer group select-none transition-transform active:scale-[0.98] border border-white/10 shadow-lg my-1"
      style={{ maxWidth: '280px' }}
    >
      {/* Loading Skeleton */}
      {!loaded && (
        <div className="w-56 h-48 bg-white/5 animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary opacity-60" />
        </div>
      )}

      <img
        src={imageUrl}
        alt="Shared image"
        onLoad={() => setLoaded(true)}
        className={`w-full max-h-[280px] object-cover rounded-2xl transition-all duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
        } group-hover:brightness-95`}
      />

      {/* Hover Expand Overlay Pill */}
      <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity text-white pointer-events-none shadow-md">
        <Maximize2 className="w-3.5 h-3.5" />
      </div>

      {caption && (
        <div className={`p-2 text-xs ${isOwn ? 'text-white/95' : 'text-slate-200'}`}>
          {caption}
        </div>
      )}
    </div>
  );
};
