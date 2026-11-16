import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Volume2, 
  Bell, 
  Play, 
  VolumeX, 
  Check, 
  ChevronDown
} from 'lucide-react';
import { 
  VoiceAssistantService, 
  type AlertSoundType, 
  type ChatNotificationConfig, 
  type VoiceAssistantSettings 
} from '../../services/voice/VoiceAssistantService';
import { HapticsService } from '../../services/feedback/HapticsService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat?: {
    id: string;
    name: string;
  } | null;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  chat
}) => {
  const isChatSpecific = Boolean(chat);

  const [globalSettings, setGlobalSettings] = useState<VoiceAssistantSettings>(VoiceAssistantService.getSettings());
  const [chatConfig, setChatConfig] = useState<ChatNotificationConfig>({
    sound: 'glass_chime',
    voiceAnnounceOverride: undefined,
    muted: false
  });

  const [soundDropdownOpen, setSoundDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setGlobalSettings(VoiceAssistantService.getSettings());
      if (chat) {
        setChatConfig(VoiceAssistantService.getChatConfig(chat.id));
      }
      setSoundDropdownOpen(false);
    }
  }, [isOpen, chat]);

  if (!isOpen) return null;

  const soundOptions: Array<{ id: AlertSoundType; label: string }> = [
    { id: 'glass_chime', label: 'Glass Chime (iOS)' },
    { id: 'pulse', label: 'Soft Pulse' },
    { id: 'bubble', label: 'Bubble Pop' },
    { id: 'electronic', label: 'High-Tech Bell' },
    { id: 'none', label: 'Silent' }
  ];

  const handleSoundPreview = (type: AlertSoundType) => {
    VoiceAssistantService.playTone(type);
    HapticsService.light();
  };

  const handleVoicePreview = () => {
    const testSender = chat ? chat.name : 'Sarah';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    VoiceAssistantService.speak(`You have a message from ${testSender} at ${time}.`);
    HapticsService.light();
  };

  const updateGlobalVoice = (enabled: boolean) => {
    const updated = { ...globalSettings, voiceAnnounceEnabled: enabled };
    setGlobalSettings(updated);
    VoiceAssistantService.saveSettings({ voiceAnnounceEnabled: enabled });
    HapticsService.selection();
  };

  const updateChatVoiceOverride = (override: boolean | undefined) => {
    if (!chat) return;
    const updated = { ...chatConfig, voiceAnnounceOverride: override };
    setChatConfig(updated);
    VoiceAssistantService.saveChatConfig(chat.id, { voiceAnnounceOverride: override });
    HapticsService.selection();
  };

  const updateChatMute = (muted: boolean) => {
    if (!chat) return;
    const updated = { ...chatConfig, muted };
    setChatConfig(updated);
    VoiceAssistantService.saveChatConfig(chat.id, { muted });
    HapticsService.selection();
  };

  const currentSound = isChatSpecific ? chatConfig.sound : globalSettings.defaultSound;
  const currentSoundLabel = soundOptions.find((s) => s.id === currentSound)?.label || 'Glass Chime (iOS)';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="glass-panel w-full max-w-sm rounded-3xl p-5 relative overflow-hidden border border-white/10 shadow-2xl bg-[#0e1524]/95"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="font-bold text-white text-base">
                {isChatSpecific ? chat?.name : 'Notifications'}
              </h3>
              <p className="text-[11px] text-slate-400">Tone & voice announcement</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3.5 pt-4">
            {/* AI Voice Announcer Row */}
            <div className="glass rounded-2xl p-3 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-teal-400" />
                  <span className="text-xs font-semibold text-white">AI Voice Announcer</span>
                </div>
                {isChatSpecific ? (
                  <select
                    value={
                      chatConfig.voiceAnnounceOverride === undefined 
                        ? 'default' 
                        : chatConfig.voiceAnnounceOverride ? 'yes' : 'no'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'default') updateChatVoiceOverride(undefined);
                      else if (val === 'yes') updateChatVoiceOverride(true);
                      else updateChatVoiceOverride(false);
                    }}
                    className="text-xs rounded-xl bg-white/10 border border-white/20 text-white px-2 py-1 outline-none cursor-pointer"
                  >
                    <option value="default" className="bg-slate-900">Global ({globalSettings.voiceAnnounceEnabled ? 'ON' : 'OFF'})</option>
                    <option value="yes" className="bg-slate-900">Always ON</option>
                    <option value="no" className="bg-slate-900">Always OFF</option>
                  </select>
                ) : (
                  <button
                    onClick={() => updateGlobalVoice(!globalSettings.voiceAnnounceEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      globalSettings.voiceAnnounceEnabled ? 'bg-teal-500' : 'bg-white/20'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform mt-1 ml-1 ${
                        globalSettings.voiceAnnounceEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleVoicePreview}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-[11px] font-semibold hover:bg-teal-500/30 transition cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Preview Voice</span>
                </button>
              </div>
            </div>

            {/* Mute Toggle (if chat-specific) */}
            {isChatSpecific && (
              <div className="glass rounded-2xl p-3 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  {chatConfig.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Bell className="w-4 h-4 text-slate-400" />}
                  <span className="text-white font-medium">Mute notifications</span>
                </div>
                <button
                  onClick={() => updateChatMute(!chatConfig.muted)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    chatConfig.muted ? 'bg-red-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow-md transform transition-transform mt-1 ml-1 ${
                      chatConfig.muted ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Compact Notification Sound Selector */}
            <div className="glass rounded-2xl p-3 border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Alert Tone</span>
                <button
                  onClick={() => handleSoundPreview(currentSound)}
                  className="text-[11px] text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play</span>
                </button>
              </div>

              <div className="relative">
                <button
                  onClick={() => setSoundDropdownOpen(!soundDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <span>{currentSoundLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${soundDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {soundDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute left-0 right-0 top-11 z-20 rounded-xl glass-strong border border-white/15 shadow-xl overflow-hidden py-1 divide-y divide-white/5"
                    >
                      {soundOptions.map((opt) => (
                        <div
                          key={opt.id}
                          onClick={() => {
                            if (isChatSpecific && chat) {
                              setChatConfig((prev) => ({ ...prev, sound: opt.id }));
                              VoiceAssistantService.saveChatConfig(chat.id, { sound: opt.id });
                            } else {
                              setGlobalSettings((prev) => ({ ...prev, defaultSound: opt.id }));
                              VoiceAssistantService.saveSettings({ defaultSound: opt.id });
                            }
                            handleSoundPreview(opt.id);
                            setSoundDropdownOpen(false);
                          }}
                          className={`px-3 py-2 text-xs flex items-center justify-between hover:bg-white/10 cursor-pointer ${
                            currentSound === opt.id ? 'text-teal-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {currentSound === opt.id && <Check className="w-3.5 h-3.5" />}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Done Button */}
          <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
            <button
              onClick={() => {
                HapticsService.light();
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-brand text-primary-foreground font-bold text-xs shadow-glow hover:opacity-90 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
