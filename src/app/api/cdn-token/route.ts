import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────────────────────────────────────────
// CDN Token proxy
//
// Mints fresh CDN tokens by calling the external token service. The API key is
// a SECRET and lives ONLY here on the server (env var) — it is never sent to the
// browser. The frontend calls this route to obtain { token, exp, cdnHost }.
//
// HARD RULES (from production bugs):
//   • Never cache a token longer than 15 seconds anywhere.
//   • Always respond with Cache-Control: no-store.
// ────────────────────────────────────────────────────────────────────────────

const TOKEN_SERVICE_URL = process.env.TOKEN_SERVICE_URL || '';
const TOKEN_SERVICE_API_KEY = process.env.TOKEN_SERVICE_API_KEY || '';
const DEFAULT_CDN_HOST = process.env.CDN_HOST || '';

// Legacy fallback: a manually-set token kept in admin_settings. Only used if the
// token service is unreachable, so existing channels don't go fully dark.

// In-memory cache — capped at 15 seconds (the hard rule). Survives only within
// a single server instance and never longer than the cap.
const MAX_CACHE_MS = 15_000;
let cache: { token: string; exp: number; cdnHost: string; fetchedAt: number } | null = null;

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}

async function fetchFromTokenService(): Promise<{ token: string; exp: number; cdnHost: string } | null> {
  if (!TOKEN_SERVICE_API_KEY) {
    console.warn('[cdn-token] TOKEN_SERVICE_API_KEY not set — cannot call token service');
    return null;
  }
  try {
    const res = await fetch(`${TOKEN_SERVICE_URL}/api/token`, {
      method: 'GET',
      headers: { 'X-Api-Key': TOKEN_SERVICE_API_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[cdn-token] Token service responded ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (!data?.token) {
      console.error('[cdn-token] Token service response missing token');
      return null;
    }
    return {
      token: data.token,
      exp: typeof data.exp === 'number' ? data.exp : 0,
      cdnHost: data.cdnHost || DEFAULT_CDN_HOST,
    };
  } catch (err) {
    console.error('[cdn-token] Token service fetch failed:', err);
    return null;
  }
}

async function fetchLegacyDbToken(): Promise<string | null> {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
    );
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('data')
      .eq('id', 'cdn_token')
      .single();
    if (!error && data?.data) {
      const parsed = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      if (parsed?.token) return parsed.token as string;
    }
  } catch (err) {
    console.error('[cdn-token] Legacy DB token lookup failed:', err);
  }
  return null;
}

export async function GET(_req: NextRequest) {
  // 1. Serve from the short-lived cache if still fresh (≤ 15s).
  if (cache && Date.now() - cache.fetchedAt < MAX_CACHE_MS) {
    return noStore({ token: cache.token, exp: cache.exp, cdnHost: cache.cdnHost, source: 'cache' });
  }

  // 2. Primary source: the token service.
  const minted = await fetchFromTokenService();
  if (minted) {
    cache = { ...minted, fetchedAt: Date.now() };
    return noStore({ token: minted.token, exp: minted.exp, cdnHost: minted.cdnHost, source: 'service' });
  }

  // 3. Fallback: manually-set DB token (keeps channels alive if service is down).
  const dbToken = await fetchLegacyDbToken();
  if (dbToken) {
    return noStore({ token: dbToken, exp: 0, cdnHost: DEFAULT_CDN_HOST, source: 'db-fallback' });
  }

  // 4. Last-resort: no token available.
  return noStore({ token: null, exp: 0, cdnHost: DEFAULT_CDN_HOST, source: 'unavailable' }, 503);
}
