import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

interface PushNotificationRequest {
  type: 'new_task_nearby' | 'task_accepted' | 'new_message' | 'lifter_arriving' | 'task_completed' | 'tip_received' | 'referral_completed';
  title: string;
  message: string;
  targetUserId?: string; // Specific user
  targetUserIds?: string[]; // Multiple users
  nearbyCoords?: { lat: number; lng: number; radiusKm: number }; // For nearby notifications
  data?: Record<string, unknown>;
  url?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      console.error('OneSignal credentials not configured');
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: PushNotificationRequest = await req.json();
    console.log('Sending push notification:', payload);

    // Build OneSignal notification payload
    const notificationPayload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: payload.title, it: payload.title },
      contents: { en: payload.message, it: payload.message },
      data: {
        type: payload.type,
        url: payload.url || '/app',
        ...payload.data,
      },
      // iOS specific
      // iOS specific
      ios_sound: 'default',
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      // Android specific
      android_sound: 'default',
      android_accent_color: 'FF5A00', // Liftome orange
      small_icon: 'ic_stat_onesignal_default',
      large_icon: 'https://liftome.app/liftome-icon-192.png',
      // Web specific
      chrome_web_icon: 'https://liftome.app/liftome-icon-192.png',
      chrome_web_badge: 'https://liftome.app/favicon.ico',
      // Priority and TTL
      priority: 10,
      ttl: 86400, // 24 hours
    };

    // Target specific user(s) or all users
    if (payload.targetUserId) {
      // Send to specific user by external_id (which is their Supabase user_id)
      notificationPayload.include_aliases = {
        external_id: [payload.targetUserId]
      };
      notificationPayload.target_channel = "push";
    } else if (payload.targetUserIds && payload.targetUserIds.length > 0) {
      // Send to multiple specific users
      notificationPayload.include_aliases = {
        external_id: payload.targetUserIds
      };
      notificationPayload.target_channel = "push";
    } else if (payload.nearbyCoords) {
      // Send to users near a location - use segment for this
      // Note: This requires location data to be stored in OneSignal tags
      notificationPayload.included_segments = ['Subscribed Users'];
      notificationPayload.filters = [
        { field: 'location', radius: payload.nearbyCoords.radiusKm * 1000, lat: payload.nearbyCoords.lat, long: payload.nearbyCoords.lng }
      ];
    } else {
      // Send to all subscribed users (fallback)
      notificationPayload.included_segments = ['Subscribed Users'];
    }

    console.log('OneSignal payload:', JSON.stringify(notificationPayload, null, 2));

    // Send to OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();
    console.log('OneSignal response:', result);

    if (!response.ok) {
      console.error('OneSignal error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, notificationId: result.id, recipients: result.recipients }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error sending push notification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
