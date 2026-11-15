import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download } from "lucide-react";

interface LightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  senderName?: string;
  timestamp?: string;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  isOpen,
  imageUrl,
  senderName,
  timestamp,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `yo-image-${Date.now()}.${imageUrl.includes("webp") ? "webp" : "jpg"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-2xl p-4 sm:p-6"
      >
        {/* Top Header Glass Bar */}
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="w-full max-w-4xl flex items-center justify-between glass-strong px-4 py-3 rounded-full border border-white/15 shadow-2xl z-10"
        >
          <div className="flex items-center gap-2 text-white">
            <span className="font-semibold text-sm">{senderName || "Photo"}</span>
            {timestamp && <span className="text-xs text-white/60">• {timestamp}</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              title="Download image"
              className="p-2 rounded-full glass hover:bg-white/20 text-white/90 transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              title="Close viewer"
              className="p-2 rounded-full glass hover:bg-white/20 text-white/90 transition-transform active:scale-95 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Center Image Container */}
        <div 
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-full max-h-[82vh] flex items-center justify-center my-auto"
        >
          <motion.img
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            src={imageUrl}
            alt="Full view"
            className="max-h-[80vh] max-w-full rounded-3xl object-contain shadow-2xl border border-white/10"
          />
        </div>

        {/* Bottom subtle bar */}
        <div className="text-center text-xs text-white/40 pb-2">
          Tap anywhere outside to close
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
