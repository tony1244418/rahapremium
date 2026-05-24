const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNzMyODYsImV4cCI6MjA5NDg0OTI4Nn0.SPP4Wg91xHHcEfXIpBUvwKIvrmPv5CE2D_axMo4n3qI';

async function testAnonRead() {
  const uid = 'user_1764692989804_mbsa1clun'; // the user_id from the QR session logs
  console.log(`Testing read for user: ${uid}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rahapremium_users?id=eq.${uid}`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });

  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Data length:', Array.isArray(data) ? data.length : 'not an array');
  console.log('Data:', JSON.stringify(data).substring(0, 100));
}

testAnonRead();
