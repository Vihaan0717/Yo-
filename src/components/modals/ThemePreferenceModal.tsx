import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sun, Moon, Smartphone, Check } from 'lucide-react';
import { HapticsService } from '../../services/feedback/HapticsService';
import { SoundEffectsService } from '../../services/feedback/SoundEffectsService';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemePreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  themePref: ThemePreference;
  onSelectTheme: (pref: ThemePreference) => void;
}

export const ThemePreferenceModal: React.FC<ThemePreferenceModalProps> = ({
  isOpen,
  onClose,
  themePref,
  onSelectTheme
}) => {
  if (!isOpen) return null;

  const options: { id: ThemePreference; title: string; desc: string; icon: any }[] = [
    {
      id: 'system',
      title: 'System default',
      desc: 'Matches your device dark or light appearance automatically',
      icon: Smartphone
    },
    {
      id: 'light',
      title: 'Light glass',
      desc: 'Clean frosted glass with bright pastel lighting',
      icon: Sun
    },
    {
      id: 'dark',
      title: 'Dark glass',
      desc: 'Deep obsidian glass with vivid neon glow',
      icon: Moon
    }
  ];

  const handleSelect = (pref: ThemePreference) => {
    onSelectTheme(pref);
    HapticsService.selection();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="glass-strong w-full max-w-sm rounded-[32px] p-6 relative overflow-hidden border border-border shadow-2xl bg-card text-card-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border/40">
            <div>
              <h3 className="text-lg font-bold text-foreground">Theme & Appearance</h3>
              <p className="text-xs text-muted-foreground">Select how Yo!!! looks on your device</p>
            </div>
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

          {/* Theme options */}
          <div className="space-y-2.5 py-4">
            {options.map((opt) => {
              const active = themePref === opt.id;
              const IconComp = opt.icon;
              return (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                    active
                      ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                      : 'glass border-border/50 text-muted-foreground hover:bg-secondary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl ${
                        active ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-secondary text-foreground'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${active ? 'text-primary' : 'text-foreground'}`}>
                        {opt.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                      active ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Done action */}
          <div className="pt-2">
            <button
              onClick={() => {
                SoundEffectsService.playDrawerClose();
                HapticsService.light();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-glow hover:opacity-90 active:scale-98 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
