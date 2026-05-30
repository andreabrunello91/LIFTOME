/**
 * Liftome — Push Notifications con OneSignal
 *
 * Il SDK è già caricato in index.html:
 * <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
 */

declare const OneSignal: any;

export async function initPushNotifications() {
  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId || appId === 'tuo-app-id') {
    console.warn('OneSignal App ID non configurato');
    return;
  }

  try {
    await OneSignal.init({
      appId,
      notifyButton: { enable: false },
      promptOptions: {
        slidedown: {
          enabled: true,
          actionMessage: "Vuoi ricevere notifiche quando arriva una nuova richiesta vicino a te?",
          acceptButtonText: "Sì, attiva",
          cancelButtonText: "No grazie",
        },
      },
    });
  } catch (e) {
    console.warn('OneSignal init failed:', e);
  }
}

/** Chiedi il permesso per le notifiche */
export async function requestNotificationPermission() {
  try {
    await OneSignal.showSlidedownPrompt();
  } catch (e) {
    console.warn('Cannot show notification prompt:', e);
  }
}

/** Registra l'utente con il suo ID Supabase */
export async function setNotificationUserId(userId: string) {
  try {
    await OneSignal.login(userId);
  } catch (e) {
    console.warn('OneSignal login failed:', e);
  }
}

/** Tipi di notifiche Liftome */
export type NotificationType =
  | 'new_request_nearby'   // helper: nuova richiesta vicino a te
  | 'request_accepted'     // richiedente: helper ha accettato
  | 'helper_nearby'        // richiedente: helper sta arrivando
  | 'mission_completed'    // entrambi: missione completata
  | 'payment_received'     // helper: pagamento ricevuto
  | 'new_message'          // chat: nuovo messaggio
  | 'new_review';          // profilo: nuova recensione

export const NOTIFICATION_TEMPLATES: Record<NotificationType, { title: string; emoji: string }> = {
  new_request_nearby:  { title: 'Nuova richiesta vicino a te!',     emoji: '⚡' },
  request_accepted:    { title: 'Helper ha accettato la missione!',  emoji: '✅' },
  helper_nearby:       { title: 'L\'helper sta arrivando!',          emoji: '🛵' },
  mission_completed:   { title: 'Missione completata!',              emoji: '🎉' },
  payment_received:    { title: 'Pagamento ricevuto!',               emoji: '💸' },
  new_message:         { title: 'Nuovo messaggio',                   emoji: '💬' },
  new_review:          { title: 'Nuova recensione ricevuta!',        emoji: '⭐' },
};
