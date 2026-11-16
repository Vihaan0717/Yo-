import React from 'react';
import { 
  Type, 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  LayoutGrid, 
  Music
} from 'lucide-react';
import type { StatusContentType } from '../types/status';

interface AddStatusToolbarProps {
  onSelectMode: (mode: StatusContentType) => void;
  onPickMedia: () => void;
}

export const AddStatusToolbar: React.FC<AddStatusToolbarProps> = ({
  onSelectMode,
  onPickMedia
}) => {
  const tools: Array<{
    id: StatusContentType | 'media' | 'music';
    label: string;
    icon: any;
    color: string;
    action: () => void;
  }> = [
    { 
      id: 'text', 
      label: 'Text', 
      icon: Type, 
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      action: () => onSelectMode('text') 
    },
    { 
      id: 'media', 
      label: 'Gallery', 
      icon: ImageIcon, 
      color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      action: onPickMedia 
    },
    { 
      id: 'image', 
      label: 'Camera', 
      icon: Camera, 
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      action: () => onSelectMode('image') 
    },
    { 
      id: 'audio', 
      label: 'Voice', 
      icon: Mic, 
      color: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      action: () => onSelectMode('audio') 
    },
    { 
      id: 'layout', 
      label: 'Layout', 
      icon: LayoutGrid, 
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      action: () => onSelectMode('layout') 
    },
    { 
      id: 'music', 
      label: 'Music', 
      icon: Music, 
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      action: () => onSelectMode('text') 
    }
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none select-none">
      {tools.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={t.action}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-semibold backdrop-blur-md transition-transform active:scale-95 shrink-0 cursor-pointer ${t.color}`}
          >
            <Icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};
