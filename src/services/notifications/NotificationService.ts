import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export class NotificationService {
  private static isInitialized = false;
  private static permissionGranted = false;

  /**
   * Request permission for both Web Notification API and Native Capacitor LocalNotifications
   */
  static async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await LocalNotifications.requestPermissions();
        this.permissionGranted = status.display === 'granted';
        return this.permissionGranted;
      }

      // Web Browser Notification API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          this.permissionGranted = true;
          return true;
        }
        if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          this.permissionGranted = permission === 'granted';
          return this.permissionGranted;
        }
      }

      return false;
    } catch (err) {
      console.warn('Failed to request notification permission:', err);
      return false;
    }
  }

  /**
   * Check if notifications are currently permitted
   */
  static async hasPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const check = await LocalNotifications.checkPermissions();
        return check.display === 'granted';
      }
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Initialize notification channels and permissions
   */
  static async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.permissionGranted = await this.hasPermission();

    // Create high-importance Android notification channel for heads-up & lockscreen popups
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.createChannel({
          id: 'yo_messages_high_priority',
          name: 'Direct Messages',
          description: 'High-priority incoming direct messages and voice alerts',
          importance: 5, // IMPORTANCE_HIGH (pops up over screen and lights display)
          visibility: 1, // VISIBILITY_PUBLIC (shows message on lock screen)
          sound: undefined,
          vibration: true,
          lights: true,
          lightColor: '#00F2FE'
        });
      } catch (err) {
        console.warn('Could not create notification channel:', err);
      }
    }
  }

  /**
   * Show a local notification when an incoming message arrives
   * and the app or chat room is in the background or unfocused
   */
  static async showIncomingMessage({
    title,
    body,
    conversationId,
    avatar
  }: {
    title: string;
    body: string;
    conversationId?: string;
    avatar?: string;
  }) {
    try {
      // Ensure channel is initialized
      if (!this.isInitialized) {
        await this.init();
      }

      // If native Android / iOS
      if (Capacitor.isNativePlatform()) {
        const hasPerm = await this.hasPermission();
        if (!hasPerm) {
          const req = await this.requestPermission();
          if (!req) return;
        }

        const id = Math.floor(Math.random() * 1000000);
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id,
              schedule: { at: new Date(Date.now() + 50) },
              channelId: 'yo_messages_high_priority',
              sound: undefined,
              extra: { conversationId },
              smallIcon: 'ic_launcher'
            }
          ]
        });
        return;
      }

      // Web Browser Notification fallback
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        const notif = new Notification(title, {
          body,
          icon: avatar || '/favicon.ico',
          tag: conversationId || 'yo-chat',
          silent: false
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (err) {
      console.warn('Could not display local notification:', err);
    }
  }
}
