import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );
}

const TRIAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const LIVE_TRIAL_PREFIX = 'live_trial_';

/**
 * GET /api/live-trial?userId=xxx
 * Returns { canTrial: boolean, usedAt: string|null, resetAt: string|null }
 */
export async function GET(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from('rahapremium_users')
      .select('content_accesses')
      .eq('id', userId)
      .single();

    if (error || !data) return NextResponse.json({ canTrial: true, usedAt: null, resetAt: null });

    const accesses: string[] = data.content_accesses || [];
    const trialUses = accesses
      .filter(a => a.startsWith(LIVE_TRIAL_PREFIX))
      .map(a => parseInt(a.replace(LIVE_TRIAL_PREFIX, ''), 10))
      .sort((a, b) => b - a);

    const lastTrial = trialUses[0] || 0;
    if (lastTrial === 0) {
      return NextResponse.json({ canTrial: true, usedAt: null, resetAt: null });
    }

    const usedAt = new Date(lastTrial);
    const elapsed = Date.now() - lastTrial;
    
    if (elapsed >= TRIAL_COOLDOWN_MS) {
      return NextResponse.json({ canTrial: true, usedAt: usedAt.toISOString(), resetAt: null });
    }

    const resetAt = new Date(lastTrial + TRIAL_COOLDOWN_MS);
    return NextResponse.json({ canTrial: false, usedAt: usedAt.toISOString(), resetAt: resetAt.toISOString() });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/live-trial
 * Body: { userId: string }
 * Marks trial as used now in Supabase by appending to content_accesses
 */
export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const { data, error: fetchError } = await supabaseAdmin
      .from('rahapremium_users')
      .select('content_accesses')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentAccesses: string[] = data?.content_accesses || [];
    const newAccesses = [...currentAccesses, `${LIVE_TRIAL_PREFIX}${Date.now()}`];

    const { error } = await supabaseAdmin
      .from('rahapremium_users')
      .update({ content_accesses: newAccesses })
      .eq('id', userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
