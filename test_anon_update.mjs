const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzMyODYsImV4cCI6MjA5NDg0OTI4Nn0.SPP4Wg91xHHcEfXIpBUvwKIvrmPv5CE2D_axMo4n3qI';

async function testAnonUpdate() {
  const uid = 'user_1764692989804_mbsa1clun';
  console.log(`Testing update for user: ${uid}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rahapremium_users?id=eq.${uid}`, {
    method: 'PATCH',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      current_device_id: 'test_123'
    })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

testAnonUpdate();
