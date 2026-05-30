import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import type { Request, Message, Conversation } from '@/types';

// ─── useRequests ──────────────────────────────────────────────────────────────
// Fetches nearby pending requests and subscribes to realtime updates

export function useRequests(radiusKm = 5) {
  const { profile }           = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading]   = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('requests')
      .select('*, requester:profiles!requester_id(*), helper:profiles!helper_id(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20);
    setRequests((data as unknown as Request[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('requests-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  async function createRequest(data: Partial<Request>) {
    if (!profile) return null;
    const { data: created, error } = await supabase
      .from('requests')
      .insert({ ...data, requester_id: profile.id })
      .select()
      .single();
    if (!error) await fetch();
    return created;
  }

  async function acceptRequest(requestId: string) {
    if (!profile) return;
    await supabase
      .from('requests')
      .update({ status: 'accepted', helper_id: profile.id, accepted_at: new Date().toISOString() })
      .eq('id', requestId);
    await fetch();
  }

  async function completeRequest(requestId: string) {
    await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', requestId);
    await fetch();
  }

  return { requests, loading, createRequest, acceptRequest, completeRequest, refresh: fetch };
}

// ─── useConversations ─────────────────────────────────────────────────────────

export function useConversations() {
  const { profile }                   = useAuth();
  const [convs, setConvs]             = useState<Conversation[]>([]);
  const [loading, setLoading]         = useState(true);

  const fetch = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select(`
        *,
        request:requests(*, requester:profiles!requester_id(*), helper:profiles!helper_id(*)),
        messages(*)
      `)
      .order('updated_at', { ascending: false });
    setConvs((data as unknown as Conversation[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  return { convs, loading, refresh: fetch };
}

// ─── useMessages ──────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | null) {
  const { profile }               = useAuth();
  const [msgs, setMsgs]           = useState<Message[]>([]);
  const [loading, setLoading]     = useState(true);

  const fetch = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMsgs((data as Message[]) ?? []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetch();
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => setMsgs(m => [...m, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, fetch]);

  async function sendMessage(text: string, type: Message['type'] = 'text') {
    if (!conversationId || !profile) return;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: profile.id,
      type,
      text,
      read: false,
    });
  }

  return { msgs, loading, sendMessage };
}

// ─── useGeolocation ───────────────────────────────────────────────────────────

interface GeoState {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(watchMode = false) {
  const [geo, setGeo] = useState<GeoState>({ lat: null, lng: null, accuracy: null, error: null, loading: true });
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo(g => ({ ...g, error: 'Geolocalizzazione non supportata', loading: false }));
      return;
    }

    const onSuccess = (pos: GeolocationPosition) => {
      setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, error: null, loading: false });
    };
    const onError = (err: GeolocationPositionError) => {
      setGeo(g => ({ ...g, error: err.message, loading: false }));
    };
    const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 };

    if (watchMode) {
      watchId.current = navigator.geolocation.watchPosition(onSuccess, onError, opts);
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, opts);
    }

    return () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); };
  }, [watchMode]);

  return geo;
}

// ─── useHelperLocation ────────────────────────────────────────────────────────
// Publishes the helper's GPS position to Supabase every 5 seconds during a mission

export function useHelperLocation(requestId: string | null, active: boolean) {
  const { profile } = useAuth();
  const geo = useGeolocation(active);

  useEffect(() => {
    if (!active || !requestId || !profile || !geo.lat || !geo.lng) return;

    const publish = async () => {
      await supabase.from('profiles')
        .update({ location_point: `POINT(${geo.lng} ${geo.lat})` })
        .eq('id', profile.id);
    };

    publish();
    const interval = setInterval(publish, 5000);
    return () => clearInterval(interval);
  }, [active, requestId, profile, geo.lat, geo.lng]);

  return geo;
}

// ─── useWallet ────────────────────────────────────────────────────────────────

export function useWallet() {
  const { profile }                 = useAuth();
  const [balance, setBalance]       = useState(0);
  const [transactions, setTxs]      = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  const fetch = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [{ data: prof }, { data: txs }] = await Promise.all([
      supabase.from('profiles').select('wallet_balance').eq('id', profile.id).single(),
      supabase.from('transactions').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
    ]);
    setBalance(prof?.wallet_balance ?? 0);
    setTxs(txs ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { fetch(); }, [fetch]);

  async function withdraw(amount: number) {
    if (!profile) return { error: 'Non autenticato' };
    const { error } = await supabase.from('transactions').insert({
      user_id: profile.id, type: 'withdrawal', status: 'pending',
      amount: -amount, description: 'Prelievo IBAN', emoji: '💸',
    });
    if (!error) await fetch();
    return { error: error?.message ?? null };
  }

  async function topUp(amount: number) {
    if (!profile) return { error: 'Non autenticato' };
    const { error } = await supabase.from('transactions').insert({
      user_id: profile.id, type: 'topup', status: 'completed',
      amount, description: 'Ricarica wallet', emoji: '💳',
    });
    if (!error) { setBalance(b => b + amount); await fetch(); }
    return { error: error?.message ?? null };
  }

  return { balance, transactions, loading, withdraw, topUp, refresh: fetch };
}
