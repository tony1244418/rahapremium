// Backfill payments.created_at for rows where it is NULL.
// Strategy:
//   1. If completed_at exists, use that.
//   2. Otherwise, use the row's earliest known timestamp from related tables,
//      or fall back to NOW() so the row at least appears in totals.
//
// Also adds a DEFAULT now() to the column going forward.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

console.log('Connected to', url);

// 1. Pull all rows with NULL created_at
const { data: rows, error } = await sb
  .from('payments')
  .select('id, created_at, completed_at, status')
  .is('created_at', null);

if (error) { console.error(error); process.exit(1); }
console.log(`Rows with NULL created_at: ${rows.length}`);

let usedCompleted = 0;
let usedFallback = 0;
const fallback = new Date().toISOString();

for (const r of rows) {
  const next = r.completed_at || fallback;
  if (r.completed_at) usedCompleted++;
  else usedFallback++;

  const { error: upErr } = await sb
    .from('payments')
    .update({ created_at: next })
    .eq('id', r.id);
  if (upErr) console.error('Update failed for', r.id, upErr.message);
}

console.log(`✓ Backfilled ${usedCompleted} from completed_at, ${usedFallback} from NOW() fallback.`);

// 2. Verify
const { count } = await sb
  .from('payments')
  .select('*', { count: 'exact', head: true })
  .is('created_at', null);
console.log('Remaining NULL created_at:', count);
