import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ────────────────────────────────────────────────────────────────────────────
// Play-URL proxy
//
// Server-side proxy to the token service's /api/play/<Channel> endpoint, which
// returns a ready-to-play manifest URL with a fresh token embedded:
//   { "url": "https://<cdn>/tok_.../live/eds/<Channel>/DASH/<Channel>.mpd", "exp": ... }
//
// The X-Api-Key secret stays on the server. Response is never cached longer
// than the token allows — we set no-store.
// ────────────────────────────────────────────────────────────────────────────

const TOKEN_SERVICE_URL = process.env.TOKEN_SERVICE_URL || 'https://aztv-token-service.onrender.com';
const TOKEN_SERVICE_API_KEY = process.env.TOKEN_SERVICE_API_KEY || '';

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
      Pragma: 'no-cache',
    },
  });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ channel: string }> }) {
  const { channel } = await ctx.params;

  if (!channel) {
    return noStore({ error: 'channel required' }, 400);
  }
  if (!TOKEN_SERVICE_API_KEY) {
    console.warn('[play] TOKEN_SERVICE_API_KEY not set');
    return noStore({ error: 'Token service not configured' }, 500);
  }

  // Only allow safe channel identifiers to avoid path injection into the
  // upstream URL.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(channel)) {
    return noStore({ error: 'invalid channel id' }, 400);
  }

  try {
    const res = await fetch(`${TOKEN_SERVICE_URL}/api/play/${encodeURIComponent(channel)}`, {
      method: 'GET',
      headers: { 'X-Api-Key': TOKEN_SERVICE_API_KEY },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[play] Token service responded ${res.status} for channel=${channel}`);
      return noStore({ error: `Upstream error ${res.status}` }, 502);
    }

    const data = await res.json();
    if (!data?.url) {
      return noStore({ error: 'Upstream response missing url' }, 502);
    }

    return noStore({ url: data.url, exp: typeof data.exp === 'number' ? data.exp : 0 });
  } catch (err) {
    console.error('[play] fetch failed:', err);
    return noStore({ error: 'Failed to reach token service' }, 502);
  }
}
