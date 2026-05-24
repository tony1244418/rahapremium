// Run with: node qr_setup.mjs
// Uses service role key to create qr_login_sessions table and disable RLS

const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3MzI4NiwiZXhwIjoyMDk0ODQ5Mjg2fQ.I9DiInUiaAdomqEV2dFhmrq8-sxg8-5zyT0gMm5svjA';

const SQL = `
  CREATE TABLE IF NOT EXISTS public.qr_login_sessions (
    id           UUID PRIMARY KEY,
    status       TEXT NOT NULL DEFAULT 'pending',
    user_id      TEXT,
    phone_number TEXT,
    expires_at   TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ALTER TABLE public.qr_login_sessions DISABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE ON public.qr_login_sessions TO anon;
  GRANT SELECT, INSERT, UPDATE ON public.qr_login_sessions TO authenticated;
`;

// Use Supabase REST API with service role to call pg_dump (won't work directly)
// Instead try via rpc call or direct fetch to SQL endpoint
async function run() {
  // Try Supabase SQL via REST RPC approach - call a postgres function
  // First, let's test table existence by trying a select
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/qr_login_sessions?limit=1`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });

  if (testRes.status === 200) {
    console.log('✅ Table qr_login_sessions already exists and is accessible!');
    console.log('The scanner should work. Try scanning the QR code again.');
    return;
  }

  const testJson = await testRes.json();
  console.log(`Table check status: ${testRes.status}`);
  console.log('Response:', JSON.stringify(testJson));

  if (testRes.status === 404 || (testJson && testJson.code === '42P01')) {
    console.log('\n❌ Table does not exist. Please run this SQL in your Supabase dashboard:');
  } else if (testRes.status === 406 || testRes.status === 401) {
    console.log('\n❌ RLS is blocking access. Please run this SQL in your Supabase dashboard:');
  } else {
    console.log('\n⚠️  Unexpected error. Please run this SQL in your Supabase dashboard:');
  }

  console.log('\n--- COPY THIS SQL INTO SUPABASE SQL EDITOR ---');
  console.log(SQL);
  console.log('----------------------------------------------');
}

run().catch(console.error);
