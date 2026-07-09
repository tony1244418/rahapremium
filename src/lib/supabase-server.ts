import { createClient } from '@supabase/supabase-js';

// Validate the URL — a truthy-but-invalid value (e.g. a project ref without
// the https:// scheme, or a stray value set in the host's env) makes
// `createClient` throw "Invalid supabaseUrl" during `next build`. We therefore
// only accept a proper http(s) URL and otherwise fall back to a valid
// placeholder so the build never crashes. At runtime, real env vars are used.
function safeUrl(u?: string): string {
  if (u && /^https?:\/\//i.test(u.trim())) return u.trim();
  return 'https://placeholder.supabase.co';
}

const supabaseUrl = safeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Missing Supabase Service Role environment variables');
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey);
