import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aguvjpqiqcsoeyyrmeix.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndXZqcHFpcWNzb2V5eXJtZWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzkwNTMsImV4cCI6MjA5NTYxNTA1M30.zdYd0rym9JlIRL69dMSos-Gq1fIsMzUihvBCpjy1SiY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;
