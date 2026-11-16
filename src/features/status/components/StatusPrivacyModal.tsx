import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  Users, 
  UserMinus, 
  UserCheck
} from 'lucide-react';
import { StatusService } from '../services/StatusService';
import { supabase } from '../../../services/supabase/client';
import type { StatusAudienceMode } from '../types/status';
import type { Profile } from '../../../types';

interface StatusPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSaved?: (mode: StatusAudienceMode, selectedUserIds: string[]) => void;
  temporaryOverride?: boolean; // if editing for current status only
}

export const StatusPrivacyModal: React.FC<StatusPrivacyModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSaved,
  temporaryOverride = false
}) => {
  const [mode, setMode] = useState<StatusAudienceMode>('contacts');
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 1. Fetch user default preferences
      StatusService.getPreferences(userId).then((prefs) => {
        setMode(prefs.default_audience_mode || 'contacts');
      });

      // 2. Fetch available contacts/profiles
      supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .limit(30)
        .then(({ data }) => {
          if (data) setContacts(data as Profile[]);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const toggleUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    if (!temporaryOverride) {
      await StatusService.savePreferences(userId, {
        default_audience_mode: mode
      });
    }
    if (onSaved) {
      onSaved(mode, selectedUserIds);
    }
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md max-h-[85vh] rounded-3xl glass-strong border border-white/20 p-5 text-white shadow-2xl flex flex-col justify-between"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Status Privacy</h3>
              <p className="text-xs text-muted-foreground">Who can see your status updates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audience Options */}
        <div className="py-4 space-y-2.5 flex-1 overflow-y-auto">
          {/* Option 1: My Contacts */}
          <div
            onClick={() => setMode('contacts')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
              mode === 'contacts' ? 'bg-primary/20 border-primary shadow-glow' : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">My Contacts</p>
                <p className="text-[10px] text-white/50">All your saved contacts can view</p>
              </div>
            </div>
            {mode === 'contacts' && <Check className="w-4 h-4 text-primary" />}
          </div>

          {/* Option 2: My Contacts Except... */}
          <div
            onClick={() => setMode('except')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
              mode === 'except' ? 'bg-primary/20 border-primary shadow-glow' : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <UserMinus className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">My Contacts Except...</p>
                <p className="text-[10px] text-white/50">
                  {mode === 'except' && selectedUserIds.length > 0 
                    ? `${selectedUserIds.length} contact${selectedUserIds.length > 1 ? 's' : ''} excluded`
                    : 'Hide status from specific contacts'}
                </p>
              </div>
            </div>
            {mode === 'except' && <Check className="w-4 h-4 text-primary" />}
          </div>

          {/* Option 3: Only Share With... */}
          <div
            onClick={() => setMode('only')}
            className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
              mode === 'only' ? 'bg-primary/20 border-primary shadow-glow' : 'bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Only Share With...</p>
                <p className="text-[10px] text-white/50">
                  {mode === 'only' && selectedUserIds.length > 0
                    ? `${selectedUserIds.length} contact${selectedUserIds.length > 1 ? 's' : ''} selected`
                    : 'Only visible to selected contacts'}
                </p>
              </div>
            </div>
            {mode === 'only' && <Check className="w-4 h-4 text-primary" />}
          </div>

          {/* Contact Picker (Shown if 'except' or 'only' is active) */}
          {(mode === 'except' || mode === 'only') && (
            <div className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-xs font-bold text-white mb-2">
                {mode === 'except' ? 'Select contacts to exclude:' : 'Select contacts to share with:'}
              </p>
              <div className="max-h-40 overflow-y-auto divide-y divide-white/5 space-y-1">
                {contacts.map((c) => {
                  const isChecked = selectedUserIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleUser(c.id)}
                      className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-white/5 cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs">
                          {c.display_name.charAt(0)}
                        </div>
                        <span className="text-xs text-white truncate max-w-[180px]">{c.display_name}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-white/20 bg-white/10 text-primary accent-primary w-4 h-4"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-white/40 leading-tight">
            Changes only apply to new status updates.
          </span>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2 rounded-2xl bg-brand text-primary-foreground font-semibold text-xs shadow-glow hover:opacity-90 transition cursor-pointer"
          >
            {loading ? 'Saving...' : 'Done'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
