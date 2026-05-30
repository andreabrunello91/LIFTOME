import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

interface AuthContextValue {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  profile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, data: Partial<User>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession]           = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile]           = useState<User | null>(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSupabaseUser(data.session?.user ?? null);
      if (data.session?.user) fetchProfile(data.session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data as User);
    } catch {
      // profile might not exist yet
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string, userData: Partial<User>) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: userData },
    });
    return { error: error as Error | null };
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/app' },
    });
    return { error: error as Error | null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function updateProfile(data: Partial<User>) {
    if (!supabaseUser) return;
    const { data: updated } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', supabaseUser.id)
      .select()
      .single();
    if (updated) setProfile(updated as User);
  }

  return (
    <AuthContext.Provider value={{
      session, supabaseUser, profile, loading,
      signUp, signIn, signInWithGoogle, signOut, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
