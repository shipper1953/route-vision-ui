
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Get Supabase URL and key from environment variables
// Use the actual variable names from env.local
const SUPABASE_URL = import.meta.env.REACT_APP_SUPABASE_URL || 'https://gidrlosmhpvdcogrkidj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHJsb3NtaHB2ZGNvZ3JraWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyOTMzMzIsImV4cCI6MjA2Mjg2OTMzMn0.DJ5r3pTVbJ80xR_kBNsc_5B_wXpIc8At646Ts-ls35Q';

// Validate that required environment variables are present
if (!SUPABASE_URL) {
  throw new Error('Missing REACT_APP_SUPABASE_URL environment variable');
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing REACT_APP_SUPABASE_ANON_KEY environment variable');
}

// Log whether we have valid Supabase credentials (without exposing actual values)
console.log('Initializing Supabase client with environment variables');

// Create Supabase client with proper auth configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
