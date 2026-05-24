import { supabase } from '@/lib/supabase';

/**
 * A drop-in replacement for `fetch()` that automatically attaches the current
 * administrator's Supabase session token as a Bearer token in the Authorization header.
 *
 * Usage:
 *   const res = await adminFetch('/api/admin/payments');
 *   const res = await adminFetch('/api/admin/feedback', { method: 'GET' });
 */
export async function adminFetch(
  input: string | URL | Request,
  init: RequestInit = {}
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const token = session?.access_token;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(input, { ...init, headers });
}
