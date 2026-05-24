// Run with: node enable_realtime.mjs

const SUPABASE_URL = 'https://flikwildlkiktotpgqxx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaWt3aWxkbGtpa3RvdHBncXh4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI3MzI4NiwiZXhwIjoyMDk0ODQ5Mjg2fQ.I9DiInUiaAdomqEV2dFhmrq8-sxg8-5zyT0gMm5svjA';

async function enableRealtime() {
  const query = `
    BEGIN;
    -- Drop it from publication if it exists to avoid errors, then add it back
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'qr_login_sessions'
      ) THEN
        -- It's already there
      ELSE
        ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_login_sessions;
      END IF;
    END
    $$;
    COMMIT;
  `;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    // We can't execute arbitrary SQL via REST easily unless we have an RPC endpoint.
    // Instead, I'll provide the exact SQL for the user, but let me try to use the query endpoint again if possible.
  });
}
