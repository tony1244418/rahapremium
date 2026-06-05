// Quick diagnostic: counts rows in `payments` table by status, and lists
// the most recent 10 payments. Helps tell whether rows actually exist or
// whether the admin page is reading nothing because of RLS/key/project URL.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local manually so this runs without dotenv installed.
const envPath = resolve(process.cwd(), '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

console.log('Supabase URL:', url);
console.log('Using key role:', JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString()).role);
console.log('');

const { count: total, error: totalErr } = await sb
  .from('payments')
  .select('*', { count: 'exact', head: true });
if (totalErr) {
  console.error('Total count error:', totalErr);
  process.exit(1);
}
console.log('Total rows in payments table:', total);

for (const status of ['pending', 'completed', 'failed', 'cancelled']) {
  const { count } = await sb
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  console.log(`  ${status}:`.padEnd(14), count ?? 0);
}

console.log('\nMost recent 10 rows:');
const { data: recent } = await sb
  .from('payments')
  .select('id, order_id, status, amount, package_type, payment_type, phone_number, completed_by, created_at, completed_at')
  .order('created_at', { ascending: false })
  .limit(10);
console.table(recent || []);

console.log('\nUsers with active subscription but NO completed payment row:');
const { data: subs } = await sb
  .from('rahapremium_users')
  .select('id, display_name, phone_number, subscription')
  .not('subscription', 'is', null)
  .limit(50);

const subbedUsers = (subs || []).filter(u => u.subscription && u.subscription !== '');
const orphans = [];
for (const u of subbedUsers) {
  const { count } = await sb
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', u.id)
    .eq('status', 'completed');
  if ((count ?? 0) === 0) orphans.push({ id: u.id, name: u.display_name, phone: u.phone_number });
}
console.log(`Subscribed users without any completed payment row: ${orphans.length}`);
if (orphans.length) console.table(orphans.slice(0, 20));
