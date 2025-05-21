
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Try to get Supabase URL and key from environment variables with different naming conventions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 
                     import.meta.env.REACT_APP_SUPABASE_URL || 
                     "https://gidrlosmhpvdcogrkidj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
                                import.meta.env.REACT_APP_SUPABASE_ANON_KEY || 
                                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpZHJsb3NtaHB2ZGNvZ3JraWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyOTMzMzIsImV4cCI6MjA2Mjg2OTMzMn0.DJ5r3pTVbJ80xR_kBNsc_5B_wXpIc8At646Ts-ls35Q";

// Log whether we have valid Supabase credentials
console.log('Initializing Supabase client with:', {
  url: SUPABASE_URL ? 'URL provided' : 'No URL provided',
  key: SUPABASE_PUBLISHABLE_KEY ? 'Key provided' : 'No key provided'
});

// Create Supabase client with proper auth configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
