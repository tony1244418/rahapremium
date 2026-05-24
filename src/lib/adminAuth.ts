import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the service-role client so we can query the admins table without RLS interference
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// A lightweight client used only for auth verification
const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey);

/**
 * Extracts the Bearer token from an Authorization header.
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
}

/**
 * Verifies that the incoming request comes from an authenticated, active administrator.
 *
 * Returns `null` if verification succeeds (caller can proceed).
 * Returns a `NextResponse` with status 401 if the request is unauthorized.
 *
 * Usage in an API route:
 *
 *   const authError = await verifyAdminRequest(request);
 *   if (authError) return authError;
 *
 */
export async function verifyAdminRequest(request: NextRequest): Promise<NextResponse | null> {
  const token = extractToken(request);

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: missing token' },
      { status: 401 }
    );
  }

  // Validate the token with Supabase Auth
  const { data: { user }, error: authError } = await adminSupabase.auth.getUser(token);

  if (authError || !user || !user.email) {
    return NextResponse.json(
      { error: 'Unauthorized: invalid session' },
      { status: 401 }
    );
  }

  // Confirm the authenticated user is an active admin
  const { data: admin, error: adminError } = await adminSupabase
    .from('admins')
    .select('id, is_active')
    .eq('email', user.email)
    .single();

  if (adminError || !admin || admin.is_active === false) {
    return NextResponse.json(
      { error: 'Unauthorized: not an active administrator' },
      { status: 401 }
    );
  }

  return null; // ✅ Authorized
}
