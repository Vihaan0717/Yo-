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
   * Initialize and request permission on first interaction
   */
  static async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.permissionGranted = await this.hasPermission();
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
              schedule: { at: new Date(Date.now() + 100) },
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
