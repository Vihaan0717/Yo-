import React from 'react';
import { Clock, Check, CheckCheck, AlertCircle } from 'lucide-react';
import type { MessageStatus } from '../types';

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  onRetry?: () => void;
  className?: string;
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  onRetry,
  className = '',
}) => {
  switch (status) {
    case 'sending':
      return (
        <span 
          title="Sending..." 
          className={`inline-flex items-center text-white/40 animate-pulse ${className}`}
        >
          <Clock className="w-3 h-3" />
        </span>
      );

    case 'sent':
      return (
        <span 
          title="Sent (persisted on server)" 
          className={`inline-flex items-center text-white/50 ${className}`}
        >
          <Check className="w-3 h-3 stroke-[2.5]" />
        </span>
      );

    case 'delivered':
      return (
        <span 
          title="Delivered to recipient device" 
          className={`inline-flex items-center text-white/70 ${className}`}
        >
          <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      );

    case 'read':
      return (
        <span 
          title="Read by recipient" 
          className={`inline-flex items-center text-[#38bdf8] drop-shadow-[0_0_6px_rgba(56,189,248,0.5)] ${className}`}
        >
          <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
        </span>
      );

    case 'failed':
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRetry?.();
          }}
          title="Failed to send. Tap to retry."
          className={`inline-flex items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer active:scale-95 transition-transform ${className}`}
        >
          <AlertCircle className="w-3 h-3" />
          <span className="text-[10px] underline font-semibold">Retry</span>
        </button>
      );

    default:
      return null;
  }
};
