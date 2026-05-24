const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3MzI4NiwiZXhwIjoyMDk0ODQ5Mjg2fQ.I9DiInUiaAdomqEV2dFhmrq8-sxg8-5zyT0gMm5svjA';

async function checkData() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/qr_login_sessions?order=created_at.desc&limit=5`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    }
  });
  
  if (res.ok) {
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error(await res.text());
  }
}
checkData();
