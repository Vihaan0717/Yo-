import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export class HapticsService {
  /**
   * Light haptic feedback for regular button taps, navigation items, emojis
   */
  static async light() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    }
  }

  /**
   * Medium haptic feedback for sending messages, opening sheets, switching tabs
   */
  static async medium() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    }
  }

  /**
   * Heavy haptic feedback for significant actions like deleting, blocking, calling
   */
  static async heavy() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    }
  }

  /**
   * Success notification vibration
   */
  static async success() {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([10, 30, 15]);
      }
    }
  }

  /**
   * Selection tick for scrolling lists, pickers, toggles
   */
  static async selection() {
    try {
      await Haptics.selectionChanged();
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
    }
  }
}
