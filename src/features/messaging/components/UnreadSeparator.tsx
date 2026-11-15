import React from 'react';
import { motion } from 'motion/react';

interface UnreadSeparatorProps {
  count?: number;
}

export const UnreadSeparator: React.FC<UnreadSeparatorProps> = ({ count }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 my-4 select-none px-2"
    >
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#2dd4bf]/40 to-[#2dd4bf]" />
      <div className="glass-strong px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase text-[#2dd4bf] border border-[#2dd4bf]/40 shadow-[0_0_12px_rgba(45,212,191,0.25)] flex items-center gap-1.5 backdrop-blur-xl">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] animate-ping" />
        <span>NEW MESSAGES {count ? `(${count})` : ''}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#2dd4bf]/40 to-[#2dd4bf]" />
    </motion.div>
  );
};
