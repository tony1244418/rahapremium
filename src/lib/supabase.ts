import { createClient } from '@supabase/supabase-js';

// Validate the URL — a truthy-but-invalid value makes `createClient` throw
// "Invalid supabaseUrl" during `next build`. Only accept a proper http(s) URL,
// otherwise fall back to a valid placeholder so the build never crashes.
function safeUrl(u?: string): string {
  if (u && /^https?:\/\//i.test(u.trim())) return u.trim();
  return 'https://placeholder.supabase.co';
}

const supabaseUrl = safeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: (...args) => {
      // Always skip cache for Supabase requests in Next.js to prevent stale config/auth
      return fetch(args[0], { ...args[1], cache: 'no-store' });
    }
  }
});
