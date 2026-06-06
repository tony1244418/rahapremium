import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const CDN_TOKEN_URL = 'https://v0-token-refresh-dashboard.vercel.app/api/token';
const FALLBACK_TOKEN = '9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV';
const CACHE_DURATION_MS = 0; // MUST be 0 because tokens have max_sessions=1 and cannot be reused

// In-memory cache (persists across requests within the same server process)
let cachedToken: string | null = null;
let cacheTimestamp: number = 0;

async function fetchTokenFromRemote(): Promise<string | null> {
  let attempts = 0;
  while (attempts < 3) {
    try {
      const res = await fetch(CDN_TOKEN_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.token && typeof json.token === 'string' && json.token.length > 10) {
          return json.token;
        }
      }
    } catch (e) {
      // Ignore and retry
    }
    attempts++;
    if (attempts < 3) {
      await new Promise(resolve => setTimeout(resolve, 500)); // wait 500ms before retry
    }
  }
  return null;
}

export async function GET() {
  const now = Date.now();

  let dbToken: string | null = null;
  let isManual = false;

  // Try checking the database first to see if there is a manual token
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

  // If the token is marked as manual, return it immediately and bypass remote fetch & caching
  if (isManual && dbToken) {
    return NextResponse.json({ token: dbToken });
  }

  // Return cached token if it's still fresh (within 6 hours) for auto mode
  if (cachedToken && now - cacheTimestamp < CACHE_DURATION_MS) {
    return NextResponse.json({ token: cachedToken });
  }

  // Try fetching from remote URL first
  const remoteToken = await fetchTokenFromRemote();

  if (remoteToken) {
    // Update in-memory cache
    cachedToken = remoteToken;
    cacheTimestamp = now;

    // Also persist to Supabase so admin panel stays in sync (marked as auto)
    try {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
      );
      await supabaseAdmin
        .from('admin_settings')
        .upsert({ id: 'cdn_token', data: { token: remoteToken, isManual: false } });
    } catch {
      // Non-critical — ignore Supabase errors
    }

    return NextResponse.json({ token: remoteToken });
  }

  // Remote fetch failed completely after retries.
  // We CANNOT fall back to dbToken if it's an auto-generated token because max_sessions=1.
  // We MUST fail or return a hardcoded fallback if it exists.
  return NextResponse.json({ token: FALLBACK_TOKEN }, { status: 500 });
}
