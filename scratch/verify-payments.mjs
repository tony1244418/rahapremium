import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { count: nullCount } = await sb.from('payments')
  .select('*', { count: 'exact', head: true })
  .is('created_at', null);
console.log('Rows with NULL created_at:', nullCount);

const { count: total } = await sb.from('payments')
  .select('*', { count: 'exact', head: true });
console.log('Total rows:', total);

const { count: completed } = await sb.from('payments')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'completed');
console.log('Completed:', completed);

// Sum the completed amount
const { data: completedRows } = await sb.from('payments')
  .select('amount, is_manually_completed, order_id, created_at, completed_at')
  .eq('status', 'completed');
const totalAmt = completedRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
const manualAmt = completedRows.filter(r => r.is_manually_completed || (r.order_id || '').toLowerCase().startsWith('manual'))
  .reduce((s, r) => s + (Number(r.amount) || 0), 0);
console.log('All-time completed total: TSH', totalAmt.toLocaleString());
console.log('Manual completed total:    TSH', manualAmt.toLocaleString());
console.log('Gateway completed total:   TSH', (totalAmt - manualAmt).toLocaleString());
