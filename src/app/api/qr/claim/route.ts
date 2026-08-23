import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { SubscriptionPackage } from '@/types';

// Force this route to be treated as dynamic — never evaluated at build time.
export const dynamic = 'force-dynamic';

function getSupabaseAdmin() {
  return supabaseServer;
}


// Fallback device limits used when a package config does not set maxDevices.
const DEFAULT_DEVICE_LIMITS: Record<string, number> = {
  FEDHA: 1,
  CHUMA: 1,
  DHAHABU: 1,
  ALMASI: 2,
  MALKIA: 4,
};

interface ActiveSession {
  deviceId: string;
  lastSeenAt: string;
  deviceLabel: string;
}

/** Read the admin-configured packages map for a given settings id. */
async function getPackagesConfig(
  supabaseAdmin: ReturnType<typeof getSupabaseAdmin>,
  settingsId: string
): Promise<Record<string, any>> {
  try {
    const { data } = await supabaseAdmin
      .from('admin_settings')
      .select('data')
      .eq('id', settingsId)
      .single();
    if ((data as any)?.data) {
      const rawData = (data as any).data;
      return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
    }
  } catch {
    /* ignore — fall back to defaults */
  }
  return {};
}

/** Resolve maxDevices for a package from config, falling back to defaults. */
function packageDeviceLimit(config: Record<string, any>, packageType?: string | null): number {
  if (!packageType) return 1;
  const configured = config?.[packageType]?.maxDevices;
  if (typeof configured === 'number' && configured > 0) return configured;
  return DEFAULT_DEVICE_LIMITS[packageType] ?? 1;
}

/** True when a stored subscription object is currently active. */
function isSubActive(sub: any): boolean {
  return !!sub && sub.isActive === true && !!sub.endDate && new Date(sub.endDate) > new Date();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, deviceId, deviceLabel } = body;

    if (!token || !deviceId) {
      return NextResponse.json(
        { success: false, error: 'token and deviceId are required' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find user with this token
    const { data: rawUserData, error: userError } = await supabaseAdmin
      .from('rahapremium_users')
      .select('id, phone_number, qr_token, qr_token_expires_at, active_sessions, subscription, live_tv_subscription, is_blocked')
      .eq('qr_token', token)
      .single();

    const userData = rawUserData as any;

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired QR code' },
        { status: 404 }
      );
    }

    if (userData.is_blocked) {
      return NextResponse.json(
        { success: false, error: 'ACCOUNT_BLOCKED' },
        { status: 403 }
      );
    }

    // Check token expiry
    const expiresAt = new Date(userData.qr_token_expires_at);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'QR code has expired. Please generate a new one.' },
        { status: 410 }
      );
    }

    // Determine device limit from BOTH the general and Live TV subscriptions,
    // using the admin-configured maxDevices per package (highest active wins).
    const [generalConfig, liveTvConfig] = await Promise.all([
      getPackagesConfig(supabaseAdmin, 'packages'),
      getPackagesConfig(supabaseAdmin, 'packages_livetv'),
    ]);

    let deviceLimit = 1;
    if (isSubActive(userData.subscription)) {
      deviceLimit = Math.max(
        deviceLimit,
        packageDeviceLimit(generalConfig, userData.subscription?.packageType)
      );
    }
    if (isSubActive(userData.live_tv_subscription)) {
      deviceLimit = Math.max(
        deviceLimit,
        packageDeviceLimit(liveTvConfig, userData.live_tv_subscription?.packageType)
      );
    }

    // Get current sessions
    let sessions: ActiveSession[] = Array.isArray(userData.active_sessions)
      ? userData.active_sessions
      : [];

    // Remove the device if it already exists (re-connect scenario)
    sessions = sessions.filter((s) => s.deviceId !== deviceId);

    // Enforce device limit — remove oldest sessions if over limit
    while (sessions.length >= deviceLimit) {
      // Sort by lastSeenAt ascending, remove the oldest
      sessions.sort((a, b) => new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime());
      sessions.shift(); // remove oldest
    }

    // Add new session
    const newSession: ActiveSession = {
      deviceId,
      lastSeenAt: new Date().toISOString(),
      deviceLabel: deviceLabel || 'Unknown Device',
    };
    sessions.push(newSession);

    // Update user: add session, clear QR token (single-use)
    const { error: updateError } = await supabaseAdmin
      .from('rahapremium_users')
      .update({
        active_sessions: sessions,
        qr_token: null,
        qr_token_expires_at: null,
        last_login_at: new Date().toISOString(),
        // Keep current_device_id updated for backward compat
        current_device_id: deviceId,
      })
      .eq('id', userData.id);

    if (updateError) {
      console.error('QR claim update error:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to claim session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: userData.id,
      phoneNumber: userData.phone_number,
    });
  } catch (error) {
    console.error('QR claim error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
