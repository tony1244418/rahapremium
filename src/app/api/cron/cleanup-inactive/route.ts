import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Accounts with no activity for this long are eligible for deletion.
const INACTIVE_DAYS = 30;

/**
 * Monthly cron: delete accounts with no activity.
 *
 * "No activity" = ALL of the following:
 *   - last login (or account creation, if never logged in) is older than INACTIVE_DAYS
 *   - no active normal subscription
 *   - no active Live TV subscription
 *
 * Admins are stored in a separate `admins` table and are never affected here.
 *
 * Safety:
 *   - Protected by CRON_SECRET (Vercel cron sends it automatically).
 *   - Supports a preview mode: GET /api/cron/cleanup-inactive?dryRun=true
 *     returns the accounts that WOULD be deleted without deleting anything.
 */
export async function GET(request: Request) {
  // Auth: same pattern as the other cron route.
  const authHeader = request.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === 'true';

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = Date.now();
    const cutoff = now - INACTIVE_DAYS * 24 * 60 * 60 * 1000;

    const { data: users, error } = await supabaseAdmin
      .from('rahapremium_users')
      .select('id, username, phone_number, last_login_at, created_at, subscription, live_tv_subscription');

    if (error) {
      console.error('[CleanupInactive] Failed to load users:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const isActive = (sub: any): boolean => {
      if (!sub || !sub.isActive) return false;
      const end = sub.endDate ? new Date(sub.endDate).getTime() : 0;
      return end > now;
    };

    const toDelete = (users || []).filter((u: any) => {
      // Determine last activity timestamp
      const lastTs = u.last_login_at
        ? new Date(u.last_login_at).getTime()
        : (u.created_at ? new Date(u.created_at).getTime() : 0);

      const inactiveLongEnough = lastTs < cutoff;
      if (!inactiveLongEnough) return false;

      // Keep anyone with an active subscription of either type
      if (isActive(u.subscription)) return false;
      if (isActive(u.live_tv_subscription)) return false;

      return true;
    });

    const ids = toDelete.map((u: any) => u.id);
    const preview = toDelete.map((u: any) => ({
      id: u.id,
      username: u.username,
      phone: u.phone_number,
      lastLoginAt: u.last_login_at || null,
    }));

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        inactiveDays: INACTIVE_DAYS,
        candidateCount: ids.length,
        candidates: preview,
      });
    }

    let deleted = 0;
    if (ids.length > 0) {
      // Delete in batches to stay within request limits
      const BATCH = 100;
      for (let i = 0; i < ids.length; i += BATCH) {
        const batch = ids.slice(i, i + BATCH);
        const { error: delError } = await supabaseAdmin
          .from('rahapremium_users')
          .delete()
          .in('id', batch);
        if (delError) {
          console.error('[CleanupInactive] Batch delete error:', delError);
        } else {
          deleted += batch.length;
        }
      }
    }

    console.log(`[CleanupInactive] Deleted ${deleted} inactive account(s).`);
    return NextResponse.json({
      success: true,
      dryRun: false,
      inactiveDays: INACTIVE_DAYS,
      deleted,
    });
  } catch (err: any) {
    console.error('[CleanupInactive] Unexpected error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected server error' },
      { status: 500 }
    );
  }
}
