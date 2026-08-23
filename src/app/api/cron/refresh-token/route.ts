import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const TOKEN_SOURCE_URL = process.env.TOKEN_SOURCE_URL || '';
const TOKEN_SERVICE_URL = process.env.TOKEN_SERVICE_URL || '';
const TOKEN_SERVICE_API_KEY = process.env.TOKEN_SERVICE_API_KEY || '';

export async function GET(request: Request) {
  // Protect the cron route from unauthorized access if secret configured
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!TOKEN_SERVICE_URL && !TOKEN_SOURCE_URL) {
    return NextResponse.json(
      { success: false, error: 'Neither TOKEN_SERVICE_URL nor TOKEN_SOURCE_URL is configured' },
      { status: 500 }
    );
  }

  let token: string | null = null;

  // 1. Try TOKEN_SERVICE_URL if available
  if (TOKEN_SERVICE_URL) {
    try {
      const res = await fetch(`${TOKEN_SERVICE_URL}/api/token`, {
        method: 'GET',
        headers: TOKEN_SERVICE_API_KEY ? { 'X-Api-Key': TOKEN_SERVICE_API_KEY } : {},
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.token && typeof json.token === 'string' && json.token.length > 10) {
          token = json.token;
        }
      }
    } catch (err) {
      console.warn('[CronRefresh] Failed from TOKEN_SERVICE_URL:', err);
    }
  }

  // 2. Fallback to TOKEN_SOURCE_URL
  if (!token && TOKEN_SOURCE_URL) {
    try {
      const res = await fetch(TOKEN_SOURCE_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.token && typeof json.token === 'string' && json.token.length > 10) {
          token = json.token;
        }
      }
    } catch (err) {
      console.error('[CronRefresh] Failed to fetch token from remote:', err);
    }
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch token from remote source' },
      { status: 502 }
    );
  }

  // Persist to Firestore with updated timestamp
  try {
    const supabaseAdmin = supabaseServer;

    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert({
        id: 'cdn_token',
        data: { token, isManual: false },
        updated_at: now,
        updated_by: 'auto-cron',
      });

    if (error) {
      console.error('[CronRefresh] Supabase upsert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save token to database' },
        { status: 500 }
      );
    }

    console.log(`[CronRefresh] Token refreshed successfully at ${now}`);
    return NextResponse.json({
      success: true,
      updated_at: now,
      token_preview: token.substring(0, 20) + '...',
    });
  } catch (err) {
    console.error('[CronRefresh] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: 'Unexpected server error' },
      { status: 500 }
    );
  }
}
