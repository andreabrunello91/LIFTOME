import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = 'https://aguvjpqiqcsoeyyrmeix.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFndXZqcHFpcWNzb2V5eXJtZWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMzkwNTMsImV4cCI6MjA5NTYxNTA1M30.zdYd0rym9JlIRL69dMSos-Gq1fIsMzUihvBCpjy1SiY';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
