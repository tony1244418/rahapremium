import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const CDN_TOKEN_URL = 'https://v0-token-refresh-dashboard.vercel.app/api/token';
const FALLBACK_TOKEN = '9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV';

// Last known good token — returned as soft fallback so the player at least tries
let lastGoodToken: string | null = null;

/**
 * Extract the real client IP from Next.js request headers.
 * Hostinger sits behind a proxy so X-Forwarded-For is the reliable source.
 */
function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    // May be a comma-separated list; first entry is the real client
    return xff.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || null;
}

/**
 * Fetch a fresh token from the remote Vercel API.
 * Passes the real client IP so AzamTV binds the token to the user's IP
 * instead of the Vercel server IP (fixes the sip mismatch / 403 bug).
 */
async function fetchTokenFromRemote(clientIp?: string | null): Promise<string | null> {
  let attempts = 0;
  while (attempts < 4) {
    try {
      const body: Record<string, string> = {};
      if (clientIp) body.clientIp = clientIp; // pass real IP if the Vercel API supports it

      const res = await fetch(CDN_TOKEN_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.token && typeof json.token === 'string' && json.token.length > 10) {
          return json.token;
        }
      }
    } catch {
      // Ignore transient errors and retry
    }
    attempts++;
    if (attempts < 4) {
      await new Promise(resolve => setTimeout(resolve, 500 * attempts)); // 500ms, 1s, 1.5s
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);

  let dbToken: string | null = null;
  let isManual = false;

  // Check database for a manually-set token (admin override)
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
      const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
      if (parsedData?.token) {
        dbToken = parsedData.token;
        isManual = parsedData.isManual === true;
      }
    }
  } catch (err) {
    console.error('Error fetching CDN token from database:', err);
  }

  // If admin has set a manual token, use it immediately
  if (isManual && dbToken) {
    lastGoodToken = dbToken;
    return NextResponse.json({ token: dbToken });
  }

  // Fetch a fresh token from Vercel, passing the client IP
  const remoteToken = await fetchTokenFromRemote(clientIp);

  if (remoteToken) {
    lastGoodToken = remoteToken;

    // Persist to Supabase (non-critical, best-effort)
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
      );
      await supabaseAdmin
        .from('admin_settings')
        .upsert({ id: 'cdn_token', data: { token: remoteToken, isManual: false } });
    } catch {
      // Non-critical — ignore
    }

    return NextResponse.json({ token: remoteToken });
  }

  // Remote completely failed.
  // Return last known good token (200) so the player at least tries — better than a blank screen.
  // The player itself handles 403s gracefully.
  if (lastGoodToken) {
    console.warn('cdn-token: Vercel API failed, returning last known good token as soft fallback');
    return NextResponse.json({ token: lastGoodToken });
  }

  // Absolute last resort — hardcoded fallback (may not work but lets the player try)
  console.error('cdn-token: All token sources exhausted, using hardcoded fallback');
  return NextResponse.json({ token: FALLBACK_TOKEN });
}
