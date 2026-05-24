// Run with: node check_rls.mjs

const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3MzI4NiwiZXhwIjoyMDk0ODQ5Mjg2fQ.I9DiInUiaAdomqEV2dFhmrq8-sxg8-5zyT0gMm5svjA';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzMyODYsImV4cCI6MjA5NDg0OTI4Nn0.SPP4Wg91xHHcEfXIpBUvwKIvrmPv5CE2D_axMo4n3qI';

async function checkRLS() {
  // Test reading with anon key
  console.log('Testing anon read access...');
  const anonRes = await fetch(`${SUPABASE_URL}/rest/v1/qr_login_sessions?limit=1`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    }
  });

  if (anonRes.status === 200) {
    console.log('✅ Anon can read the table. No RLS blocking reads.');
  } else {
    console.log(`❌ Anon read failed. Status: ${anonRes.status}`);
    const err = await anonRes.json();
    console.log(JSON.stringify(err));
  }

  // To check if RLS is enabled, we'll try to insert a dummy record with anon key
  const dummyId = crypto.randomUUID();
  console.log('\nTesting anon insert access...');
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/qr_login_sessions`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: dummyId,
      status: 'pending',
      expires_at: new Date(Date.now() + 60000).toISOString()
    })
  });

  if (insertRes.status === 201) {
    console.log('✅ Anon can insert. No RLS blocking inserts.');
    // cleanup
    await fetch(`${SUPABASE_URL}/rest/v1/qr_login_sessions?id=eq.${dummyId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });
  } else {
    console.log(`❌ Anon insert failed. Status: ${insertRes.status}`);
    const err = await insertRes.json();
    console.log(JSON.stringify(err));
  }
}

checkRLS().catch(console.error);
