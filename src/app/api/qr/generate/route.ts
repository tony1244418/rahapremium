import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force this route to be treated as dynamic — never evaluated at build time.
export const dynamic = 'force-dynamic';

// Lazily create the admin client INSIDE the handler so `next build` doesn't
// crash ("Invalid supabaseUrl") on hosts without env vars during build.
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Verify user exists
    const { data: userData, error: userError } = await supabaseAdmin
      .from('rahapremium_users')
      .select('id, phone_number, subscription')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Generate a secure random token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store token in DB
    const { error: updateError } = await supabaseAdmin
      .from('rahapremium_users')
      .update({
        qr_token: token,
        qr_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ success: false, error: 'Failed to generate token' }, { status: 500 });
    }

    // Build the deep link URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    request.headers.get('origin') || 
                    '';
    if (!baseUrl) {
      return NextResponse.json({ success: false, error: 'NEXT_PUBLIC_SITE_URL is not configured' }, { status: 500 });
    }

    const deepLink = `${baseUrl}/auth?qr=${token}`;

    // Build QR image URL using free API (SVG format for better scaling)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(deepLink)}&bgcolor=ffffff&color=4f46e5&margin=10&format=svg`;

    return NextResponse.json({
      success: true,
      token,
      deepLink,
      qrImageUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('QR generate error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
