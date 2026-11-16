/**
 * VoiceAssistantService.ts
 * High-performance, zero-paid-API Web SpeechSynthesis & Audio Alert engine for Yo!!!.
 * Provides:
 * 1. AI Voice Spoken Announcer ("You have a message from [Sender] saying: [Content] at [Time]")
 * 2. Web Audio synthesized chime tones (pleasant glass bell chime, pulse tone, bubble chime)
 * 3. Granular per-contact and global settings persistence in localStorage.
 */

export type AlertSoundType = 'glass_chime' | 'pulse' | 'bubble' | 'electronic' | 'none';

export interface ChatNotificationConfig {
  sound: AlertSoundType;
  voiceAnnounceOverride?: boolean; // undefined inherits global
  customToneUrl?: string;
  muted?: boolean;
}

export interface VoiceAssistantSettings {
  voiceAnnounceEnabled: boolean;
  voiceSpeed: number; // 0.8 to 1.2
  voicePitch: number; // 0.8 to 1.2
  defaultSound: AlertSoundType;
  readMessageContent: boolean; // whether to read the body snippet or just "[Sender] sent you a message"
}

const SETTINGS_KEY = 'yo_voice_assistant_settings';
const CHAT_CONFIGS_KEY = 'yo_chat_notification_configs';

const DEFAULT_SETTINGS: VoiceAssistantSettings = {
  voiceAnnounceEnabled: true,
  voiceSpeed: 1.0,
  voicePitch: 1.05,
  defaultSound: 'glass_chime',
  readMessageContent: true
};

export class VoiceAssistantService {
  private static audioCtx: AudioContext | null = null;
  private static recentAnnouncements = new Map<string, number>();

  private static getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Load global voice assistant settings from localStorage
   */
  static getSettings(): VoiceAssistantSettings {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Error reading voice assistant settings:', e);
    }
    return DEFAULT_SETTINGS;
  }

  /**
   * Save global voice assistant settings
   */
  static saveSettings(settings: Partial<VoiceAssistantSettings>) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving voice assistant settings:', e);
    }
  }

  /**
   * Get notification settings for a specific chat / contact
   */
  static getChatConfig(chatId: string): ChatNotificationConfig {
    try {
      const raw = localStorage.getItem(CHAT_CONFIGS_KEY);
      if (raw) {
        const map = JSON.parse(raw);
        if (map[chatId]) return map[chatId];
      }
    } catch (e) {
      console.warn('Error reading chat notification config:', e);
    }
    return {
      sound: this.getSettings().defaultSound,
      voiceAnnounceOverride: undefined,
      muted: false
    };
  }

  /**
   * Save notification settings for a specific chat / contact
   */
  static saveChatConfig(chatId: string, config: Partial<ChatNotificationConfig>) {
    try {
      const raw = localStorage.getItem(CHAT_CONFIGS_KEY);
      const map = raw ? JSON.parse(raw) : {};
      map[chatId] = { ...(map[chatId] || { sound: this.getSettings().defaultSound }), ...config };
      localStorage.setItem(CHAT_CONFIGS_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Error saving chat config:', e);
    }
  }

  /**
   * Play crystal-clear synthesized alerts using zero-weight Web Audio API
   */
  static playTone(type: AlertSoundType = 'glass_chime') {
    if (type === 'none') return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'glass_chime') {
        // High harmonic glass chime (similar to iOS / macOS glass chime)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1320, now); // E6
        osc2.frequency.exponentialRampToValueAtTime(2640, now + 0.25);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
      } else if (type === 'pulse') {
        // Double modern soft digital pulse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08);

        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);
        gain.gain.setValueAtTime(0.22, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'bubble') {
        // Playful bubble pop
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.12);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'electronic') {
        // Crisp high-tech chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        osc.frequency.setValueAtTime(1318.5, now + 0.07); // E6

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  /**
   * Speak announcement using Web SpeechSynthesis API:
   * "You have a message from [sender] at [time]: [content]"
   */
  static speak(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      const settings = this.getSettings();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.voiceSpeed || 1.0;
      utterance.pitch = settings.voicePitch || 1.05;

      // Select optimal natural voice (English preferred)
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(
          (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Siri') || v.name.includes('Microsoft')) && v.lang.startsWith('en')
        ) || voices.find((v) => v.lang.startsWith('en')) || voices[0];
        if (preferred) utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  /**
   * Handle incoming message notification:
   * Decides whether to announce via AI Voice or play contact's custom tone.
   */
  static handleIncomingAlert({
    chatId,
    senderName,
    content,
    time,
    messageId
  }: {
    chatId: string;
    senderName: string;
    content: string;
    time?: string;
    messageId?: string;
  }) {
    // 1. Strict deduplication key: prevents duplicate announcements from simultaneous broadcast + DB insert
    const dedupeKey = messageId ? `${chatId}_${messageId}` : `${chatId}_${content}`;
    const now = Date.now();
    const lastSpoken = this.recentAnnouncements.get(dedupeKey);
    if (lastSpoken && now - lastSpoken < 5000) {
      // Already alerted for this message within 5 seconds
      return;
    }
    this.recentAnnouncements.set(dedupeKey, now);

    // Clean up cache
    if (this.recentAnnouncements.size > 100) {
      for (const [k, ts] of this.recentAnnouncements.entries()) {
        if (now - ts > 10000) this.recentAnnouncements.delete(k);
      }
    }

    const chatConfig = this.getChatConfig(chatId);
    if (chatConfig.muted) return;

    const globalSettings = this.getSettings();
    const shouldVoiceAnnounce =
      chatConfig.voiceAnnounceOverride !== undefined
        ? chatConfig.voiceAnnounceOverride
        : globalSettings.voiceAnnounceEnabled;

    const displayTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const cleanSender = senderName && senderName !== 'Someone' ? senderName : 'A contact';

    if (shouldVoiceAnnounce) {
      // 1. Play quick subtle cue tone first
      this.playTone('bubble');

      // 2. Synthesize conversational voice message
      let cleanContent = content;
      if (content.startsWith('data:image')) cleanContent = 'a photo';
      else if (content.startsWith('data:video')) cleanContent = 'a video';
      else if (content.startsWith('data:audio')) cleanContent = 'a voice note';
      else if (content.startsWith('data:application')) cleanContent = 'a document';
      else if (cleanContent.length > 70) cleanContent = cleanContent.slice(0, 70) + '...';

      const announcement = globalSettings.readMessageContent
        ? `You have a message from ${cleanSender} at ${displayTime}: "${cleanContent}"`
        : `You have a new message from ${cleanSender} at ${displayTime}`;

      // Short delay so chime finishes cleanly before speech starts
      setTimeout(() => {
        this.speak(announcement);
      }, 350);
    } else {
      // Custom contact sound or default sound
      this.playTone(chatConfig.sound || globalSettings.defaultSound);
    }
  }
}
