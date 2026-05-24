import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SubscriptionPackage } from '@/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Plan-based device limits
const DEVICE_LIMITS: Record<string, number> = {
  FEDHA: 1,
  CHUMA: 1,
  DHAHABU: 1,
  ALMASI: 2,
  MALKIA: 4,
};

function getDeviceLimit(packageType?: string | null): number {
  if (!packageType) return 1;
  return DEVICE_LIMITS[packageType] ?? 1;
}

interface ActiveSession {
  deviceId: string;
  lastSeenAt: string;
  deviceLabel: string;
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

    // Find user with this token
    const { data: userData, error: userError } = await supabaseAdmin
      .from('rahapremium_users')
      .select('id, phone_number, qr_token, qr_token_expires_at, active_sessions, subscription, is_blocked')
      .eq('qr_token', token)
      .single();

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

    // Determine device limit from subscription
    const packageType: string | null = userData.subscription?.packageType ?? null;
    const isActive: boolean = userData.subscription?.isActive === true &&
      new Date(userData.subscription?.endDate) > new Date();
    const deviceLimit = isActive ? getDeviceLimit(packageType) : 1;

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
