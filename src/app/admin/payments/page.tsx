'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, RefreshCw, CheckCircle, XCircle, Clock, Search,
  AlertTriangle, Zap, Phone, User, Package, Calendar, ExternalLink,
  ChevronDown, ChevronUp, Filter, TrendingUp, DollarSign, Trash2,
} from 'lucide-react';

// ── Gateway detection helper ──────────────────────────────────────────────
// Uses completed_by (most reliable) then falls back to order reference format.
// Our ClickPesa refs start with C and are 10-20 uppercase alphanumeric chars.
function detectGateway(payment: { order_id?: string; completed_by?: string | null }): 'clickpesa' | 'harakapay' {
  // 1. completed_by is the most reliable signal
  const cb = (payment.completed_by || '').toLowerCase();
  if (cb.includes('harakapay')) return 'harakapay';
  if (cb.includes('clickpesa')) return 'clickpesa';

  // 2. Fallback: inspect order reference format
  const ref = (payment.order_id || '').trim();
  if (ref.startsWith('HP')) return 'harakapay';
  // ClickPesa refs we generate: C + 10-19 uppercase alphanum (e.g. CCTLT3XYWD2KAK)
  if (/^C[A-Z0-9]{9,18}$/.test(ref)) return 'clickpesa';
  
  // Default to harakapay for unknown non-ClickPesa formats
  return 'harakapay';
}

interface Payment {
  id: string;
  user_id: string;
  order_id: string;
  package_type: string;
  payment_type: string;
  amount: number;
  phone_number: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
  is_manually_completed: boolean;
  content_id?: string;
  content_type?: string;
  game_id?: string;
}

interface PaymentUser {
  id: string;
  display_name: string;
  username: string;
  phone_number: string;
}

const STATUS_COLORS = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  completed: 'bg-green-500/15 text-green-400 border-green-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const STATUS_ICONS = {
  pending: Clock,
  completed: CheckCircle,
  failed: XCircle,
};

// ── Revenue summary type ─────────────────────────────────────────────────
interface GatewayRevenue {
  total: number;
  clickpesa: number;
  harakapay: number;
  manual: number;
  count: number;
  cpCount: number;
  hpCount: number;
  manualCount: number;
}

export default function AdminPaymentsPage() {
  const { adminUser } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<Record<string, PaymentUser>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('pending');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [gatewayStatus, setGatewayStatus] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  // Maps a content_id → its human title (for content/PPV payments)
  const [contentTitles, setContentTitles] = useState<Record<string, string>>({});

  // ── Revenue calculations ───────────────────────────────────────────────
  // NOTE: manually-completed payments are excluded from gateway totals
  // and tracked separately under `manual` / `manualCount`.
  // Some legacy rows have created_at = NULL (older inserts didn't set it),
  // so we fall back to completed_at when grouping by day.
  const paymentDate = (p: Payment): Date | null => {
    const raw = p.created_at || p.completed_at;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const revenueFor = (targetPayments: Payment[]): GatewayRevenue => {
    const completed = targetPayments.filter(p => p.status === 'completed');
    return completed.reduce(
      (acc, p) => {
        const amt = Number(p.amount) || 0;
        acc.count += 1;
        // Manual payments — do NOT add to gateway revenue
        const isManualOrder = p.order_id && p.order_id.toLowerCase().startsWith('manual');
        if (p.is_manually_completed || isManualOrder) {
          acc.manual += amt;
          acc.manualCount += 1;
          return acc;
        }
        acc.total += amt;
        const gw = detectGateway(p);
        if (gw === 'clickpesa') { acc.clickpesa += amt; acc.cpCount += 1; }
        else { acc.harakapay += amt; acc.hpCount += 1; }
        return acc;
      },
      { total: 0, clickpesa: 0, harakapay: 0, manual: 0, count: 0, cpCount: 0, hpCount: 0, manualCount: 0 }
    );
  };

  const todayRevenue = React.useMemo((): GatewayRevenue => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return revenueFor(payments.filter(p => {
      const d = paymentDate(p);
      return d !== null && d >= start;
    }));
  }, [payments]);

  const yesterdayRevenue = React.useMemo((): GatewayRevenue => {
    const startY = new Date(); startY.setDate(startY.getDate() - 1); startY.setHours(0, 0, 0, 0);
    const endY = new Date(); endY.setHours(0, 0, 0, 0);
    return revenueFor(payments.filter(p => {
      const d = paymentDate(p);
      return d !== null && d >= startY && d < endY;
    }));
  }, [payments]);

  // This week — last 7 days (including today)
  const weekRevenue = React.useMemo((): GatewayRevenue => {
    const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
    return revenueFor(payments.filter(p => {
      const d = paymentDate(p);
      return d !== null && d >= start;
    }));
  }, [payments]);

  // This month — from the 1st of the current month
  const monthRevenue = React.useMemo((): GatewayRevenue => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return revenueFor(payments.filter(p => {
      const d = paymentDate(p);
      return d !== null && d >= start;
    }));
  }, [payments]);

  const allTimeRevenue = React.useMemo((): GatewayRevenue => revenueFor(payments), [payments]);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setPayments((data as Payment[]) || []);

      // Load user info for all unique user IDs
      const userIds = [...new Set((data || []).map((p: Payment) => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('rahapremium_users')
          .select('id, display_name, username, phone_number')
          .in('id', userIds);
        const map: Record<string, PaymentUser> = {};
        (usersData || []).forEach((u: PaymentUser) => { map[u.id] = u; });
        setUsers(map);
      }

      // Resolve content titles for content/PPV payments so admin sees WHICH
      // content each user paid for (not just the word "content").
      const contentIds = [...new Set(
        (data || [])
          .filter((p: Payment) => p.content_id)
          .map((p: Payment) => p.content_id as string)
      )];
      if (contentIds.length > 0) {
        const titleMap: Record<string, string> = {};
        // Query all content tables — IDs are UUIDs so there's no collision.
        const [movies, series, stories, episodes] = await Promise.all([
          supabase.from('movies').select('id, title').in('id', contentIds),
          supabase.from('series').select('id, title').in('id', contentIds),
          supabase.from('stories').select('id, title').in('id', contentIds),
          supabase.from('episodes').select('id, title').in('id', contentIds),
        ]);
        [movies.data, series.data, stories.data, episodes.data].forEach(rows => {
          (rows || []).forEach((r: { id: string; title: string }) => {
            if (r.title) titleMap[r.id] = r.title;
          });
        });
        setContentTitles(titleMap);
      }
    } catch (err) {
      console.error('Error loading payments:', err);
      showToast('error', 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  // Check Gateway status for a payment
  const checkGatewayStatus = async (payment: Payment) => {
    if (!payment.order_id) return;
    const gw = detectGateway(payment);
    setGatewayStatus(prev => ({ ...prev, [payment.id]: 'checking...' }));
    try {
      const res = await fetch(`/api/payment/status?order_id=${payment.order_id}&gateway=${gw}`);
      const data = await res.json();
      const status = data.payment_status || data.status || 'UNKNOWN';
      setGatewayStatus(prev => ({ ...prev, [payment.id]: status }));
    } catch {
      setGatewayStatus(prev => ({ ...prev, [payment.id]: 'ERROR' }));
    }
  };

  // Complete a payment manually (calls webhook-like logic server-side)
  const completePayment = async (payment: Payment) => {
    if (!confirm(`Kukamilisha malipo haya kwa ${users[payment.user_id]?.display_name || payment.phone_number}?\n\nPackage: ${payment.package_type}\nTSH: ${(payment.amount || 0).toLocaleString()}`)) return;

    setActionLoading(payment.id);
    try {
      const newOrderId = payment.order_id?.startsWith('manual_') ? payment.order_id : `manual_${payment.order_id || payment.id}`;

      // First update payment status to completed
      const { error: payErr } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          is_manually_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: `admin:${adminUser?.uid || 'unknown'}`,
          order_id: newOrderId,
        })
        .eq('id', payment.id);

      if (payErr) throw payErr;

      // Trigger the webhook logic by calling the webhook endpoint with COMPLETED status
      const gateway = detectGateway(payment);
      const webhookPath = gateway === 'clickpesa' ? '/api/webhook/clickpesa' : '/api/webhook/harakapay';
      
      const webhookRes = await fetch(webhookPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: payment.id,
          order_id: newOrderId,
          orderReference: newOrderId, // for clickpesa
          payment_status: 'COMPLETED',
          status: 'COMPLETED', // for clickpesa
          amount: payment.amount,
          collectedAmount: payment.amount, // for clickpesa
          phone_number: payment.phone_number,
        }),
      });

      const webhookData = await webhookRes.json();
      if (!webhookData.success) {
        // Webhook said payment already completed - that's OK
        if (webhookData.message?.includes('already completed')) {
          // Still grant subscription directly
          await grantSubscriptionDirectly(payment);
        } else {
          throw new Error(webhookData.message || 'Webhook processing failed');
        }
      }

      showToast('success', `Malipo yamekamilika — ${users[payment.user_id]?.display_name || payment.phone_number} amepata huduma!`);
      await loadPayments();
    } catch (err: any) {
      console.error('Error completing payment:', err);
      showToast('error', `Imeshindwa: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Direct subscription grant as fallback
  const grantSubscriptionDirectly = async (payment: Payment) => {
    const { data: userData } = await supabase
      .from('rahapremium_users')
      .select('*')
      .eq('id', payment.user_id)
      .single();

    if (!userData) return;

    const packageDays: Record<string, number> = {
      FEDHA: 3, CHUMA: 7, DHAHABU: 14, ALMASI: 30, MALKIA: 180,
    };
    const days = packageDays[payment.package_type] || 30;
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const newSub = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      packageType: payment.package_type,
      startDate: now,
      endDate,
      isActive: true,
      transactionId: payment.id,
      amount: payment.amount,
      isRenewal: false,
      isUpgrade: false,
      createdAt: now,
    };

    const history = [...(userData.subscription_history || []), newSub];

    await supabase.from('rahapremium_users').update({
      subscription: JSON.parse(JSON.stringify(newSub)),
      subscription_history: JSON.parse(JSON.stringify(history)),
    }).eq('id', payment.user_id);
  };

  // Mark as failed
  const markFailed = async (payment: Payment) => {
    if (!confirm('Futa malipo haya (mark as failed)?')) return;
    setActionLoading(payment.id);
    try {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', payment.id);
      showToast('success', 'Malipo yamefutwa');
      await loadPayments();
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Bulk delete all payments of a given status (pending or failed)
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const deleteAllByStatus = async (status: 'pending' | 'failed') => {
    const count = payments.filter(p => p.status === status).length;
    if (count === 0) {
      showToast('error', `Hakuna malipo ya ${status}`);
      return;
    }
    if (!confirm(`Una uhakika unataka kufuta ALL ${count} ${status} payments?\n\nHatua hii haiwezi kurudishwa (permanent delete).`)) return;

    setBulkDeleting(true);
    try {
      const { error } = await supabase.from('payments').delete().eq('status', status);
      if (error) throw error;
      showToast('success', `Umefuta ${count} ${status} payments`);
      await loadPayments();
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      showToast('error', `Imeshindwa: ${err.message}`);
    } finally {
      setBulkDeleting(false);
    }
  };

  const filtered = payments.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const u = users[p.user_id];
      return (
        (p.order_id || '').toLowerCase().includes(q) ||
        (p.phone_number || '').includes(q) ||
        (p.package_type || '').toLowerCase().includes(q) ||
        (u?.display_name || '').toLowerCase().includes(q) ||
        (u?.username || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    completed: payments.filter(p => p.status === 'completed').length,
    failed: payments.filter(p => p.status === 'failed').length,
  };

  return (
    <div className="container-mobile space-y-6 py-6">

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
                  toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}
              >
                {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {toast.msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">Payment Management</h1>
              <p className="text-dark-400 text-sm mt-1">Simamia malipo na kukamilisha ya pending</p>
            </div>
            <button
              onClick={loadPayments}
              disabled={loading}
              className="touch-button bg-dark-800 hover:bg-dark-700 text-dark-100 p-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* ── Revenue Summary ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {/* Today */}
            <div className="glass-effect rounded-xl p-4 border border-dark-700/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <TrendingUp size={14} className="text-emerald-400" />
                </div>
                <span className="text-sm font-bold text-dark-100">Leo</span>
                <span className="ml-auto text-xs text-dark-500">{todayRevenue.count} malipo</span>
              </div>
              <div className="text-xl font-black text-emerald-400 mb-3">
                TSH {todayRevenue.total.toLocaleString()}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    <span className="text-dark-400">ClickPesa</span>
                    <span className="text-dark-600">({todayRevenue.cpCount})</span>
                  </span>
                  <span className="font-semibold text-blue-300">TSH {todayRevenue.clickpesa.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                    <span className="text-dark-400">HarakaPay</span>
                    <span className="text-dark-600">({todayRevenue.hpCount})</span>
                  </span>
                  <span className="font-semibold text-primary-300">TSH {todayRevenue.harakapay.toLocaleString()}</span>
                </div>
                {todayRevenue.manualCount > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-dark-700/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                      <span className="text-dark-400">Manual</span>
                    </span>
                    <span className="text-primary-400 font-medium">({todayRevenue.manualCount} transactions)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Yesterday */}
            <div className="glass-effect rounded-xl p-4 border border-dark-700/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <DollarSign size={14} className="text-amber-400" />
                </div>
                <span className="text-sm font-bold text-dark-100">Jana</span>
                <span className="ml-auto text-xs text-dark-500">{yesterdayRevenue.count} malipo</span>
              </div>
              <div className="text-xl font-black text-amber-400 mb-3">
                TSH {yesterdayRevenue.total.toLocaleString()}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    <span className="text-dark-400">ClickPesa</span>
                    <span className="text-dark-600">({yesterdayRevenue.cpCount})</span>
                  </span>
                  <span className="font-semibold text-blue-300">TSH {yesterdayRevenue.clickpesa.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                    <span className="text-dark-400">HarakaPay</span>
                    <span className="text-dark-600">({yesterdayRevenue.hpCount})</span>
                  </span>
                  <span className="font-semibold text-primary-300">TSH {yesterdayRevenue.harakapay.toLocaleString()}</span>
                </div>
                {yesterdayRevenue.manualCount > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-dark-700/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                      <span className="text-dark-400">Manual</span>
                    </span>
                    <span className="text-primary-400 font-medium">({yesterdayRevenue.manualCount} transactions)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Weekly & Monthly income ─────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {/* This Week */}
            <div className="glass-effect rounded-xl p-4 border border-dark-700/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                  <TrendingUp size={14} className="text-indigo-400" />
                </div>
                <span className="text-sm font-bold text-dark-100">Wiki Hii (7 days)</span>
                <span className="ml-auto text-xs text-dark-500">{weekRevenue.count} malipo</span>
              </div>
              <div className="text-xl font-black text-indigo-400 mb-3">
                TSH {weekRevenue.total.toLocaleString()}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    <span className="text-dark-400">ClickPesa</span>
                    <span className="text-dark-600">({weekRevenue.cpCount})</span>
                  </span>
                  <span className="font-semibold text-blue-300">TSH {weekRevenue.clickpesa.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                    <span className="text-dark-400">HarakaPay</span>
                    <span className="text-dark-600">({weekRevenue.hpCount})</span>
                  </span>
                  <span className="font-semibold text-primary-300">TSH {weekRevenue.harakapay.toLocaleString()}</span>
                </div>
                {weekRevenue.manualCount > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-dark-700/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                      <span className="text-dark-400">Manual</span>
                    </span>
                    <span className="text-primary-400 font-medium">({weekRevenue.manualCount} transactions)</span>
                  </div>
                )}
              </div>
            </div>

            {/* This Month */}
            <div className="glass-effect rounded-xl p-4 border border-dark-700/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center">
                  <DollarSign size={14} className="text-fuchsia-400" />
                </div>
                <span className="text-sm font-bold text-dark-100">Mwezi Huu</span>
                <span className="ml-auto text-xs text-dark-500">{monthRevenue.count} malipo</span>
              </div>
              <div className="text-xl font-black text-fuchsia-400 mb-3">
                TSH {monthRevenue.total.toLocaleString()}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    <span className="text-dark-400">ClickPesa</span>
                    <span className="text-dark-600">({monthRevenue.cpCount})</span>
                  </span>
                  <span className="font-semibold text-blue-300">TSH {monthRevenue.clickpesa.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                    <span className="text-dark-400">HarakaPay</span>
                    <span className="text-dark-600">({monthRevenue.hpCount})</span>
                  </span>
                  <span className="font-semibold text-primary-300">TSH {monthRevenue.harakapay.toLocaleString()}</span>
                </div>
                {monthRevenue.manualCount > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-dark-700/40">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                      <span className="text-dark-400">Manual</span>
                    </span>
                    <span className="text-primary-400 font-medium">({monthRevenue.manualCount} transactions)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All-Time totals row */}
          <div className="glass-effect rounded-xl p-4 border border-dark-700/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <TrendingUp size={14} className="text-cyan-400" />
              </div>
              <span className="text-sm font-bold text-dark-100">Jumla Yote (All Time)</span>
              <span className="ml-auto text-xs text-dark-500">{allTimeRevenue.count} malipo</span>
            </div>
            <div className="text-xl font-black text-cyan-400 mb-3">
              TSH {allTimeRevenue.total.toLocaleString()}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* ClickPesa */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                  <span className="text-xs font-bold text-blue-300">ClickPesa</span>
                </div>
                <div className="text-base font-black text-blue-300">TSH {allTimeRevenue.clickpesa.toLocaleString()}</div>
                <div className="text-xs text-blue-500 mt-0.5">{allTimeRevenue.cpCount} transactions</div>
              </div>
              {/* HarakaPay */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                  <span className="text-xs font-bold text-primary-300">HarakaPay</span>
                </div>
                <div className="text-base font-black text-primary-300">TSH {allTimeRevenue.harakapay.toLocaleString()}</div>
                <div className="text-xs text-primary-500 mt-0.5">{allTimeRevenue.hpCount} transactions</div>
              </div>
              {/* Manual — always shown in all-time */}
              <div className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-primary-400 inline-block"></span>
                  <span className="text-xs font-bold text-primary-300">Manual (Admin)</span>
                </div>
                <div className="text-base font-black text-primary-400 mt-2">{allTimeRevenue.manualCount} transactions</div>
                <div className="text-xs text-primary-500/70 mt-1">Value hidden</div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {(['all', 'pending', 'completed', 'failed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  filter === s
                    ? s === 'pending' ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : s === 'completed' ? 'bg-green-500/20 border-green-500/40 text-green-300'
                      : s === 'failed' ? 'bg-red-500/20 border-red-500/40 text-red-300'
                      : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'glass-effect border-dark-700/50 text-dark-400 hover:text-dark-100'
                }`}
              >
                <div className="text-xl font-black">{counts[s]}</div>
                <div className="text-xs capitalize mt-0.5">{s}</div>
              </button>
            ))}
          </div>

          {/* Warning banner for pending */}
          {counts.pending > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-300 font-semibold text-sm">
                  Kuna malipo {counts.pending} yanayosubiri kukamilishwa
                </p>
                <p className="text-amber-400/70 text-xs mt-0.5">
                  Bonyeza "Kamilisha" kwenye kila malipo kuipa mtumiaji huduma mara moja.
                </p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tafuta kwa namba, jina, au order ID..."
              className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
            />
          </div>

          {/* Bulk delete — only shown when viewing pending or failed */}
          {(filter === 'pending' || filter === 'failed') && counts[filter] > 0 && (
            <button
              onClick={() => deleteAllByStatus(filter)}
              disabled={bulkDeleting}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-600/90 hover:bg-red-500 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-red-600/20"
            >
              {bulkDeleting ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
              Futa {filter === 'pending' ? 'Pending' : 'Failed'} Zote ({counts[filter]})
            </button>
          )}

          {/* Payments List */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="glass-effect rounded-xl p-4 h-24 animate-pulse bg-dark-800/50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-effect rounded-xl p-10 text-center">
              <Filter size={36} className="mx-auto text-dark-600 mb-3" />
              <p className="text-dark-400">Hakuna malipo yaliyopatikana</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((payment, index) => {
                const user = users[payment.user_id];
                const StatusIcon = STATUS_ICONS[payment.status] || Clock;
                const isExpanded = expandedId === payment.id;
                const isActing = actionLoading === payment.id;
                const gwStatus = gatewayStatus[payment.id];

                return (
                  <motion.div
                    key={payment.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.025 }}
                    className="glass-effect rounded-xl overflow-hidden border border-dark-700/50"
                  >
                    {/* Row */}
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Status badge */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${STATUS_COLORS[payment.status]}`}>
                          <StatusIcon size={14} />
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm">
                              {user?.display_name || payment.phone_number || 'Unknown'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[payment.status]}`}>
                              {payment.status}
                            </span>
                            {payment.is_manually_completed && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/30">
                                admin
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-dark-400">
                            <span className="flex items-center gap-1">
                              <Package size={11} />
                              {payment.payment_type === 'content'
                                ? (payment.content_id && contentTitles[payment.content_id]
                                    ? `${contentTitles[payment.content_id]}${payment.content_type ? ` (${payment.content_type})` : ''}`
                                    : `Content${payment.content_type ? ` (${payment.content_type})` : ''}`)
                                : (payment.package_type || payment.payment_type || '—')}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard size={11} />
                              TSH {(payment.amount || 0).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone size={11} />
                              {payment.phone_number || '—'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {new Date(payment.created_at).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {payment.status === 'pending' && (
                            <button
                              onClick={() => completePayment(payment)}
                              disabled={isActing}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 shadow-lg shadow-green-600/20"
                            >
                              {isActing ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                              Kamilisha
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                            className="w-7 h-7 flex items-center justify-center text-dark-500 hover:text-dark-200 transition-colors"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-dark-700/40 space-y-3">
                            {/* Detail grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-dark-800/60 rounded-lg p-2.5">
                                <div className="text-dark-500 mb-0.5">Order ID</div>
                                <div className="text-dark-200 font-mono break-all">{payment.order_id || '—'}</div>
                              </div>
                              <div className="bg-dark-800/60 rounded-lg p-2.5">
                                <div className="text-dark-500 mb-0.5">Payment ID</div>
                                <div className="text-dark-200 font-mono break-all">{payment.id}</div>
                              </div>
                              {user && (
                                <div className="bg-dark-800/60 rounded-lg p-2.5">
                                  <div className="text-dark-500 mb-0.5">User</div>
                                  <div className="text-dark-200">@{user.username}</div>
                                  <div className="text-dark-400">{user.phone_number}</div>
                                </div>
                              )}
                              {payment.completed_at && (
                                <div className="bg-dark-800/60 rounded-lg p-2.5">
                                  <div className="text-dark-500 mb-0.5">Completed At</div>
                                  <div className="text-dark-200">{new Date(payment.completed_at).toLocaleString()}</div>
                                  {payment.completed_by && <div className="text-dark-500">{payment.completed_by}</div>}
                                </div>
                              )}
                            </div>

                            {/* Gateway badge */}
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                                detectGateway(payment) === 'clickpesa'
                                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                  : detectGateway(payment) === 'harakapay'
                                  ? 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                                  : 'bg-primary-500/15 text-primary-400 border-primary-500/30'
                              }`}>
                                {detectGateway(payment) === 'clickpesa' ? 'ClickPesa' : 'HarakaPay'}
                              </span>
                            </div>

                            {/* Gateway status check */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => checkGatewayStatus(payment)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-lg border border-blue-500/30 transition-all"
                              >
                                <ExternalLink size={11} />
                                Angalia Gateway
                              </button>
                              {gwStatus && (
                                <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                                  gwStatus === 'COMPLETED' || gwStatus === 'SUCCESS' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                                  gwStatus === 'FAILED' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                  'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                }`}>
                                  Status: {gwStatus}
                                </span>
                              )}

                              {payment.status === 'pending' && (
                                <button
                                  onClick={() => markFailed(payment)}
                                  disabled={isActing}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/15 hover:bg-red-600/25 text-red-400 text-xs font-semibold rounded-lg border border-red-500/30 transition-all disabled:opacity-50"
                                >
                                  <XCircle size={11} />
                                  Mark Failed
                                </button>
                              )}

                              {payment.status === 'failed' && (
                                <button
                                  onClick={() => completePayment(payment)}
                                  disabled={isActing}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/15 hover:bg-green-600/25 text-green-400 text-xs font-semibold rounded-lg border border-green-500/30 transition-all disabled:opacity-50"
                                >
                                  <CheckCircle size={11} />
                                  Kamilisha Hata Hivyo
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
  );
}
