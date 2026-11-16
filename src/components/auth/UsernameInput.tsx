import React, { useState, useEffect, useRef } from 'react';
import { AtSign, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { IdentityService } from '../../services/auth/IdentityService';

interface UsernameInputProps {
  value: string;
  onChange: (val: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  disabled?: boolean;
}

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'reserved' | 'error';

export const UsernameInput: React.FC<UsernameInputProps> = ({
  value,
  onChange,
  onValidityChange,
  disabled
}) => {
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    const clean = value.trim();

    if (!clean) {
      setStatus('idle');
      setStatusMessage('');
      onValidityChange?.(false);
      return;
    }

    // Instant local format validation
    const localCheck = IdentityService.validateFormat(clean);
    if (!localCheck.valid) {
      setStatus(localCheck.reason?.includes('reserved') ? 'reserved' : 'invalid');
      setStatusMessage(localCheck.reason || 'Invalid username format');
      onValidityChange?.(false);
      return;
    }

    // Debounced server-side availability check
    setStatus('checking');
    setStatusMessage('Checking availability...');

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      const result = await IdentityService.checkAvailability(clean);
      if (result.available) {
        setStatus('available');
        setStatusMessage(`@${clean} is available`);
        onValidityChange?.(true);
      } else {
        setStatus('taken');
        setStatusMessage(result.reason || 'Username is not available');
        onValidityChange?.(false);
      }
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value]);

  const renderStatusIcon = () => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />;
      case 'available':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'taken':
      case 'reserved':
        return <XCircle className="w-4 h-4 text-rose-400" />;
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <AtSign className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          required
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
          placeholder="username"
          className={`glass w-full pl-11 pr-11 py-3 rounded-2xl text-sm outline-none text-white placeholder:text-muted-foreground transition-all duration-200 ${
            status === 'available'
              ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : status === 'taken' || status === 'reserved'
              ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : status === 'invalid'
              ? 'border-amber-500/50'
              : 'border-white/10'
          }`}
        />
        <div className="absolute right-4 top-3.5 flex items-center">
          {renderStatusIcon()}
        </div>
      </div>

      {statusMessage && status !== 'idle' && (
        <div
          className={`text-[11px] px-2 flex items-center gap-1.5 transition-all ${
            status === 'available'
              ? 'text-emerald-400 font-medium'
              : status === 'taken' || status === 'reserved'
              ? 'text-rose-400 font-medium'
              : status === 'invalid'
              ? 'text-amber-400'
              : 'text-slate-400'
          }`}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
};
