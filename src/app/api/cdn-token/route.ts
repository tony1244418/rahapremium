import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const FALLBACK_TOKEN = '9mtbtkZuZYH3TvzrMcC4Mgu6CpuN0ogV';

export async function GET(_req: NextRequest) {
  // Try to get a manually-set token from the database
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
        return NextResponse.json({ token: parsedData.token });
      }
    }
  } catch (err) {
    console.error('cdn-token: Error fetching from database:', err);
  }

  // Return hardcoded fallback
  return NextResponse.json({ token: FALLBACK_TOKEN });
}
