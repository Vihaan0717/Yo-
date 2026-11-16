import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Volume2, 
  Bell, 
  Sparkles, 
  Play, 
  VolumeX, 
  Check, 
  Sliders
} from 'lucide-react';
import { 
  VoiceAssistantService, 
  type AlertSoundType, 
  type ChatNotificationConfig, 
  type VoiceAssistantSettings 
} from '../../services/voice/VoiceAssistantService';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If chatId is passed, it manages settings for this specific chat. If null, it's global settings.
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

  // Global settings state
  const [globalSettings, setGlobalSettings] = useState<VoiceAssistantSettings>(VoiceAssistantService.getSettings());
  
  // Chat-specific state
  const [chatConfig, setChatConfig] = useState<ChatNotificationConfig>({
    sound: 'glass_chime',
    voiceAnnounceOverride: undefined,
    muted: false
  });

  useEffect(() => {
    if (isOpen) {
      setGlobalSettings(VoiceAssistantService.getSettings());
      if (chat) {
        setChatConfig(VoiceAssistantService.getChatConfig(chat.id));
      }
    }
  }, [isOpen, chat]);

  if (!isOpen) return null;

  const soundOptions: Array<{ id: AlertSoundType; label: string; desc: string }> = [
    { id: 'glass_chime', label: 'Glass Chime', desc: 'Sleek crystal iOS tone' },
    { id: 'pulse', label: 'Soft Pulse', desc: 'Modern dual-tone pulse' },
    { id: 'bubble', label: 'Bubble Pop', desc: 'Crisp playful pop' },
    { id: 'electronic', label: 'High-Tech Bell', desc: 'Futuristic crisp chime' },
    { id: 'none', label: 'Silent', desc: 'No sound alert' }
  ];

  const handleSoundPreview = (type: AlertSoundType) => {
    VoiceAssistantService.playTone(type);
  };

  const handleVoicePreview = () => {
    const testSender = chat ? chat.name : 'Sarah';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    VoiceAssistantService.speak(`You have a message from ${testSender} at ${time}: "Hey, are you free to talk?"`);
  };

  const updateGlobalVoice = (enabled: boolean) => {
    const updated = { ...globalSettings, voiceAnnounceEnabled: enabled };
    setGlobalSettings(updated);
    VoiceAssistantService.saveSettings({ voiceAnnounceEnabled: enabled });
  };

  const updateReadContent = (read: boolean) => {
    const updated = { ...globalSettings, readMessageContent: read };
    setGlobalSettings(updated);
    VoiceAssistantService.saveSettings({ readMessageContent: read });
  };

  const updateGlobalSound = (sound: AlertSoundType) => {
    const updated = { ...globalSettings, defaultSound: sound };
    setGlobalSettings(updated);
    VoiceAssistantService.saveSettings({ defaultSound: sound });
    handleSoundPreview(sound);
  };

  const updateChatSound = (sound: AlertSoundType) => {
    if (!chat) return;
    const updated = { ...chatConfig, sound };
    setChatConfig(updated);
    VoiceAssistantService.saveChatConfig(chat.id, { sound });
    handleSoundPreview(sound);
  };

  const updateChatVoiceOverride = (override: boolean | undefined) => {
    if (!chat) return;
    const updated = { ...chatConfig, voiceAnnounceOverride: override };
    setChatConfig(updated);
    VoiceAssistantService.saveChatConfig(chat.id, { voiceAnnounceOverride: override });
  };

  const updateChatMute = (muted: boolean) => {
    if (!chat) return;
    const updated = { ...chatConfig, muted };
    setChatConfig(updated);
    VoiceAssistantService.saveChatConfig(chat.id, { muted });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md rounded-3xl glass-strong border border-white/20 p-6 text-white shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {isChatSpecific ? `Notifications · ${chat?.name}` : 'Voice Assistant & Alerts'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isChatSpecific ? 'Custom tone & voice rule for this chat' : 'AI voice notifications & sound tones'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 1: AI Voice Assistant Announcement */}
          <div className="mt-5 space-y-4">
            <div className="flex items-start justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="pr-3">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-white">AI Voice Message Announcer</span>
                </div>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  {isChatSpecific 
                    ? `Have Yo speak "You have a message from ${chat?.name}..." when messages arrive.`
                    : 'Reads incoming messages out loud with sender name, time, and content.'}
                </p>
              </div>

              {isChatSpecific ? (
                <div className="flex flex-col gap-1.5 shrink-0">
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
                    className="text-xs rounded-xl bg-black/40 border border-white/20 text-white px-2.5 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="default" className="bg-slate-900">Use Global ({globalSettings.voiceAnnounceEnabled ? 'ON' : 'OFF'})</option>
                    <option value="yes" className="bg-slate-900">Always ON</option>
                    <option value="no" className="bg-slate-900">Always OFF</option>
                  </select>
                </div>
              ) : (
                <button
                  onClick={() => updateGlobalVoice(!globalSettings.voiceAnnounceEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    globalSettings.voiceAnnounceEnabled ? 'bg-primary' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      globalSettings.voiceAnnounceEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Read Content Toggle & Voice Tester */}
            <div className="flex items-center justify-between px-2 text-xs">
              {!isChatSpecific && (
                <label className="flex items-center gap-2 cursor-pointer text-white/80 hover:text-white">
                  <input
                    type="checkbox"
                    checked={globalSettings.readMessageContent}
                    onChange={(e) => updateReadContent(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-primary accent-primary w-4 h-4"
                  />
                  <span>Read message content snippet</span>
                </label>
              )}
              
              <button
                onClick={handleVoicePreview}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-medium transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test AI Voice</span>
              </button>
            </div>

            {/* Section 2: Contact Mute Toggle (if chat-specific) */}
            {isChatSpecific && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 text-xs">
                  {chatConfig.muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Bell className="w-4 h-4 text-white/70" />}
                  <span>Mute notifications for {chat?.name}</span>
                </div>
                <button
                  onClick={() => updateChatMute(!chatConfig.muted)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    chatConfig.muted ? 'bg-red-500' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      chatConfig.muted ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Section 3: Sound Tones (Played if Voice is off or as chime before speak) */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/70">
                  <Sliders className="w-3.5 h-3.5 text-primary" />
                  <span>{isChatSpecific ? 'Custom Notification Sound' : 'Default Alert Tone'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {soundOptions.map((opt) => {
                  const activeSound = isChatSpecific ? chatConfig.sound : globalSettings.defaultSound;
                  const isSelected = activeSound === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => {
                        if (isChatSpecific) updateChatSound(opt.id);
                        else updateGlobalSound(opt.id);
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-primary/20 border-primary shadow-glow' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected ? 'bg-primary text-black font-bold' : 'bg-white/10 text-white/70'
                        }`}>
                          {isSelected ? <Check className="w-4 h-4" /> : <Bell className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white leading-tight">{opt.label}</p>
                          <p className="text-[10px] text-white/50">{opt.desc}</p>
                        </div>
                      </div>

                      {opt.id !== 'none' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSoundPreview(opt.id);
                          }}
                          className="p-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-white/80 hover:text-primary transition"
                          title="Preview tone"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Done */}
          <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-2xl bg-brand text-primary-foreground font-semibold text-xs shadow-glow hover:opacity-90 transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
