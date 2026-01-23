// OneSignal Notification Service for Liftome
// Handles push notifications for tasks, messages, and updates

import { supabase } from "@/integrations/supabase/client";

export type NotificationType = 
  | 'new_task_nearby'
  | 'task_accepted'
  | 'lifter_assigned'
  | 'new_message'
  | 'lifter_arriving'
  | 'task_completed'
  | 'tip_received'
  | 'referral_completed';

interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  url?: string;
}

interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  targetUserId?: string;
  targetUserIds?: string[];
  nearbyCoords?: { lat: number; lng: number; radiusKm: number };
  data?: Record<string, unknown>;
  url?: string;
}

// OneSignal App ID (public). If env is missing in preview/build, fall back to the known project App ID.
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || "tx25z55f7upauajtvn7lz2ypz";

class NotificationService {
  private initialized = false;
  private permissionGranted = false;
  private currentUserId: string | null = null;
  private onNotificationCallback: ((data: NotificationData) => void) | null = null;

  private emitInApp(notification: NotificationData) {
    try {
      this.onNotificationCallback?.(notification);
    } catch (e) {
      console.error("Notification callback error:", e);
    }
  }

  async init() {
    if (this.initialized) return;

    // Don't auto-request permission here (browsers often block without user gesture).
    // We only READ the current permission state; the explicit request is handled by the UI dialog.
    if ("Notification" in window) {
      this.permissionGranted = Notification.permission === "granted";
    }

    if (!ONESIGNAL_APP_ID) {
      console.log('OneSignal App ID not configured - using native browser notifications');
      this.initialized = true;
      return;
    }

    // Mark as initialized immediately to prevent blocking
    this.initialized = true;

    try {
      // Load OneSignal script if not already loaded - NON-BLOCKING
      if (!document.querySelector('script[src*="OneSignalSDK"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        script.async = true;
        document.head.appendChild(script);
        // Don't wait for script to load - let it load in background
      }

      // @ts-ignore
      window.OneSignalDeferred = window.OneSignalDeferred || [];

      // @ts-ignore
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: "/OneSignalSDKWorker.js",
            notifyButton: { enable: false },
          });

          // IMPORTANT: do NOT request permission automatically here.
          // Browsers will block permission prompts without an explicit user gesture.
          try {
            const perm = await OneSignal.Notifications.permission;
            this.permissionGranted = perm === true || perm === "granted";
          } catch {
            // ignore
          }

          // Listen for foreground notifications (when app is open)
          OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
            try {
              // Ensure it still displays as a system notification
              event.preventDefault?.();

              const notif = event.getNotification?.() ?? event.notification;
              const additionalData = notif?.additionalData || {};

              console.log("Notification received (foreground):", { notif, additionalData });

              if (notif) {
                this.emitInApp({
                  type: additionalData.type || "new_message",
                  title: notif.title,
                  message: notif.body,
                  data: additionalData,
                  url: additionalData.url,
                });
              }

              // Display after our hook
              event.getNotification?.().display?.();
            } catch (e) {
              console.error("foregroundWillDisplay handler error:", e);
            }
          });

          // Listen for notification clicks
          OneSignal.Notifications.addEventListener("click", (event: any) => {
            console.log("Notification clicked:", event);

            const notif = event.getNotification?.() ?? event.notification;
            const additionalData = notif?.additionalData || {};

            if (notif) {
              this.emitInApp({
                type: additionalData.type || "new_message",
                title: notif.title,
                message: notif.body,
                data: additionalData,
                url: additionalData.url,
              });
            }

            const url = additionalData.url;
            if (url && window.location.pathname !== url) {
              window.location.href = url;
            }
          });

          // Listen for permission changes
          OneSignal.Notifications.addEventListener("permissionChange", (permission: boolean) => {
            console.log("Notification permission changed:", permission);
            this.permissionGranted = permission;
          });

          console.log("OneSignal initialized successfully");
        } catch (error) {
          console.error("OneSignal init error:", error);
        }
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize OneSignal:', error);
      this.initialized = true; // Mark as initialized anyway to prevent retries
    }
  }

  setNotificationCallback(callback: (data: NotificationData) => void) {
    this.onNotificationCallback = callback;
  }

  async requestPermission(): Promise<boolean> {
    try {
      // Ensure SDK is loaded (safe: init does NOT auto-prompt)
      await this.init();

      // Request native permission (must be user-initiated)
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === "granted";
      }

      // Also request OneSignal permission if available
      // @ts-ignore
      if (typeof window.OneSignal !== "undefined") {
        // @ts-ignore
        await window.OneSignal.Notifications.requestPermission();
        try {
          // @ts-ignore
          const perm = await window.OneSignal.Notifications.permission;
          this.permissionGranted = this.permissionGranted && (perm === true || perm === "granted");
        } catch {
          // ignore
        }
      }

      return this.permissionGranted;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return false;
    }
  }

  async isPermissionGranted(): Promise<boolean> {
    if ('Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  async setUserId(userId: string) {
    this.currentUserId = userId;
    try {
      // If OneSignal is ready, login immediately. Otherwise queue it.
      // @ts-ignore
      if (typeof window.OneSignal !== 'undefined') {
        // @ts-ignore
        await window.OneSignal.login(userId);
        console.log('OneSignal user logged in:', userId);
        return;
      }

      // @ts-ignore
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      // @ts-ignore
      window.OneSignalDeferred.push(async (OneSignal: any) => {
        try {
          await OneSignal.login(userId);
          console.log('OneSignal user logged in (deferred):', userId);
        } catch (e) {
          console.error('Failed to set OneSignal user ID (deferred):', e);
        }
      });
    } catch (error) {
      console.error('Failed to set OneSignal user ID:', error);
    }
  }

  async logout() {
    this.currentUserId = null;
    try {
      // @ts-ignore
      if (typeof window.OneSignal !== 'undefined') {
        // @ts-ignore
        await window.OneSignal.logout();
        console.log('OneSignal user logged out');
      }
    } catch (error) {
      console.error('Failed to logout from OneSignal:', error);
    }
  }

  async addTags(tags: Record<string, string>) {
    try {
      // @ts-ignore
      if (typeof window.OneSignal !== 'undefined') {
        // @ts-ignore
        await window.OneSignal.User.addTags(tags);
      }
    } catch (error) {
      console.error('Failed to add OneSignal tags:', error);
    }
  }

  async updateLocation(lat: number, lng: number) {
    try {
      // @ts-ignore
      if (typeof window.OneSignal !== 'undefined') {
        // Store location as tags for filtering
        // @ts-ignore
        await window.OneSignal.User.addTags({
          lat: lat.toString(),
          lng: lng.toString(),
        });
      }
    } catch (error) {
      console.error('Failed to update location in OneSignal:', error);
    }
  }

  // Send push notification via edge function (server-side)
  async sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
    try {
      console.log('Sending push notification via edge function:', payload);

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload,
      });

      if (error) {
        console.error('Failed to send push notification:', error);
        return false;
      }

      console.log('Push notification sent:', data);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Show local notification (fallback for when OneSignal isn't available)
  showLocalNotification(notification: NotificationData) {
    // Always emit in-app so the bell updates even if system permission is denied.
    this.emitInApp(notification);

    if ('Notification' in window && Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: notification.message,
        icon: '/liftome-icon-192.png',
        badge: '/liftome-icon-192.png',
        tag: notification.type,
        data: {
          url: notification.url || '/app',
          ...notification.data,
        },
      };

      const notif = new Notification(notification.title, options);

      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // Play sound
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {}); // Ignore if autoplay blocked
      } catch {}

      notif.onclick = () => {
        window.focus();
        if (notification.url) {
          window.location.href = notification.url;
        }
        notif.close();
      };
    }
  }

  // ============= Pre-built notification methods =============

  // Notify Lifters about new task nearby
  async notifyNewTaskNearby(taskTitle: string, distance: number, price: number, coords?: { lat: number; lng: number }) {
    const notification: NotificationData = {
      type: 'new_task_nearby',
      title: '📍 Nuovo task vicino!',
      message: `${taskTitle} a ${distance}m – ${price}€`,
      url: '/app?tab=guadagna',
      data: { taskTitle, distance, price },
    };

    // Show local notification
    this.showLocalNotification(notification);

    // Send push to nearby users if coords provided
    if (coords) {
      await this.sendPushNotification({
        ...notification,
        nearbyCoords: { ...coords, radiusKm: 2 }, // 2km radius
      });
    }
  }

  // Notify Client that Lifter accepted their task
  async notifyTaskAccepted(clientUserId: string, lifterName: string, taskTitle: string) {
    const notification: NotificationData = {
      type: 'task_accepted',
      title: '✅ Task accettato!',
      message: `${lifterName} ha accettato il tuo task – ${taskTitle}`,
      url: '/app?tab=miei-lift',
      data: { lifterName, taskTitle },
    };

    // Send push to specific client
    await this.sendPushNotification({
      ...notification,
      targetUserId: clientUserId,
    });
  }

  // Notify Lifter that they have been assigned to a task by the client
  async notifyLifterAssigned(lifterUserId: string, clientName: string, taskTitle: string): Promise<void> {
    const notification: NotificationData = {
      type: 'lifter_assigned',
      title: '🎉 Sei stato scelto!',
      message: `${clientName} ti ha assegnato il task "${taskTitle}" – Apri la mappa!`,
      url: '/app?tab=guadagna',
      data: { clientName, taskTitle, openMap: true },
    };

    // Show in-app notification
    this.showLocalNotification(notification);

    // Send push notification
    await this.sendPushNotification({
      ...notification,
      targetUserId: lifterUserId,
    });
  }

  // Notify about new chat message
  async notifyNewMessage(recipientUserId: string, senderName: string, taskId?: string) {
    const notification: NotificationData = {
      type: 'new_message',
      title: '💬 Nuovo messaggio',
      message: `Nuovo messaggio da ${senderName}`,
      url: taskId ? `/app?tab=miei-lift&chat=${taskId}` : '/app?tab=miei-lift',
      data: { senderName, taskId },
    };

    // Send push to specific recipient
    await this.sendPushNotification({
      ...notification,
      targetUserId: recipientUserId,
    });
  }

  // Notify Client that Lifter is arriving
  async notifyLifterArriving(clientUserId: string, lifterName: string, distance: number) {
    const notification: NotificationData = {
      type: 'lifter_arriving',
      title: '🚶 Lifter in arrivo!',
      message: `${lifterName} è a ${distance} m`,
      url: '/app?tab=miei-lift',
      data: { lifterName, distance },
    };

    await this.sendPushNotification({
      ...notification,
      targetUserId: clientUserId,
    });
  }

  // Notify Lifter that task is completed
  async notifyTaskCompleted(lifterUserId: string, taskTitle: string) {
    const notification: NotificationData = {
      type: 'task_completed',
      title: '🎉 Task completato!',
      message: `Task "${taskTitle}" completato – Attendi la mancia!`,
      url: '/app?tab=profilo',
      data: { taskTitle },
    };

    await this.sendPushNotification({
      ...notification,
      targetUserId: lifterUserId,
    });
  }

  // Notify Lifter about tip received
  async notifyTipReceived(lifterUserId: string, amount: number, fromName: string) {
    const notification: NotificationData = {
      type: 'tip_received',
      title: '💰 Mancia ricevuta!',
      message: `Hai ricevuto ${amount}€ di mancia da ${fromName} – Grazie!`,
      url: '/app?tab=profilo',
      data: { amount, fromName },
    };

    await this.sendPushNotification({
      ...notification,
      targetUserId: lifterUserId,
    });
  }

  // Notify about referral bonus
  async notifyReferralCompleted(userId: string, tasksCount: number, bonus: number) {
    const notification: NotificationData = {
      type: 'referral_completed',
      title: '🎁 Bonus referral!',
      message: `Il tuo amico ha fatto ${tasksCount} task – +${bonus}€ per te!`,
      url: '/app?tab=profilo',
      data: { tasksCount, bonus },
    };

    await this.sendPushNotification({
      ...notification,
      targetUserId: userId,
    });
  }
}

export const notificationService = new NotificationService();
