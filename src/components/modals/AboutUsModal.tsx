import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  MessageSquare,
  Heart
} from 'lucide-react';
import { HapticsService } from '../../services/feedback/HapticsService';
import { SoundEffectsService } from '../../services/feedback/SoundEffectsService';

const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleLinkClick = (url: string) => {
    SoundEffectsService.playTap();
    HapticsService.light();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
          className="glass-strong w-full max-w-sm rounded-[32px] p-6 relative overflow-hidden border border-border shadow-2xl bg-card text-card-foreground max-h-[90vh] flex flex-col justify-between"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-lg font-bold text-foreground">About Us</h3>
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

          <div className="overflow-y-auto space-y-4 py-3 flex-1 pr-0.5">
            {/* Branding Header */}
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow mb-3">
                <MessageSquare className="w-10 h-10 text-white fill-white/20" />
                <span className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-card border border-border shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                </span>
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Yo!!!</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2.5 py-0.5 rounded-full glass border border-border text-[11px] font-semibold text-primary">
                  Version 1.0.0
                </span>
                <span className="px-2.5 py-0.5 rounded-full glass border border-border text-[11px] font-semibold text-accent">
                  iOS Glass
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2.5 max-w-[270px] leading-relaxed">
                A modern, cloud-first messaging system engineered for speed, privacy, and fluid haptic feedback.
              </p>
            </div>

            {/* Development & Studio Info */}
            <div className="glass rounded-2xl p-3.5 border border-border space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Engineered By
              </div>
              <div className="text-sm font-bold text-foreground">
                LeafBubble <span className="text-primary font-semibold">by KannaLAB</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                Dedicated to crafting next-generation mobile experiences with fluid glassmorphism and acoustic micro-interactions.
              </p>
            </div>

            {/* Founder & Leadership */}
            <div className="glass rounded-2xl p-3.5 border border-border space-y-1">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                Founder & Lead Architect
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-foreground">Mugasala Rohit</div>
                  <div className="text-xs text-primary font-semibold">CEO · @kanna_xdev</div>
                </div>
              </div>
            </div>

            {/* Links Section */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-1">
                Official Links & Portfolio
              </div>

              {/* Website Portfolio Link */}
              <button
                type="button"
                onClick={() => handleLinkClick('https://mainportfolio-dusky-nine.vercel.app/')}
                className="w-full flex items-center justify-between p-3 rounded-2xl glass border border-border hover:bg-secondary/60 hover:border-primary/50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                      Website Portfolio
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                      mainportfolio-dusky-nine.vercel.app
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>

              {/* LinkedIn Link */}
              <button
                type="button"
                onClick={() => handleLinkClick('https://www.linkedin.com/in/mugasala-rohit')}
                className="w-full flex items-center justify-between p-3 rounded-2xl glass border border-border hover:bg-secondary/60 hover:border-primary/50 transition cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                    <LinkedInIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                      LinkedIn
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                      linkedin.com/in/mugasala-rohit
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors shrink-0" />
              </button>
            </div>
          </div>

          {/* Footer & Dismiss Button */}
          <div className="pt-3 border-t border-border/40 space-y-2">
            <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500 inline" />
              <span>by LeafBubble</span>
            </div>
            <button
              onClick={() => {
                SoundEffectsService.playDrawerClose();
                HapticsService.light();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80 active:scale-98 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
