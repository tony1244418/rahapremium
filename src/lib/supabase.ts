import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (...args) => {
      // Always skip cache for Supabase requests in Next.js to prevent stale config/auth
      return fetch(args[0], { ...args[1], cache: 'no-store' });
    }
  }
});
