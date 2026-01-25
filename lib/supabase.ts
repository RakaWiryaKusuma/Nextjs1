import { createClient } from '@supabase/supabase-js';

// Safe way to get Supabase client (only works on client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Export a function to get Supabase client
export const getSupabase = () => {
  // Check if we're on client-side
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseKey);
};

// For direct import (use carefully)
export const supabase = typeof window !== 'undefined' 
  ? createClient(supabaseUrl!, supabaseKey!)
  : null;