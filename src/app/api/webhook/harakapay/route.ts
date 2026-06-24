import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { User, PaymentStatus } from '@/types';

/**
 * HarakaPay Webhook Handler
 * HarakaPay posts payment status updates here after USSD push is confirmed or fails.
 *
 * Expected payload from HarakaPay:
 * {
 *   "order_id": "HP1706123456789",
 *   "status": "completed" | "failed",
 *   "amount": 10000,
 *   "net_amount": 9400,
 *   "fee_amount": 600,
 *   "created_at": "...",
 *   "completed_at": "..."
 * }
 */

const toDate = (dateStr: string | null | undefined): Date => {
  if (!dateStr) return new Date();
  return new Date(dateStr);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 HarakaPay Webhook received:', JSON.stringify(body, null, 2));

    const orderId: string   = body.order_id || '';
    const rawStatus: string = body.status   || '';
    const amount            = body.amount   || '';

    if (!orderId) {
      console.error('❌ HarakaPay Webhook: order_id missing');
      return NextResponse.json({ success: false, message: 'order_id required' }, { status: 400 });
    }

    const statusUpper      = rawStatus.toUpperCase().trim();
    const normalizedStatus =
      statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS' ? 'COMPLETED' : statusUpper;

    console.log(`[HarakaPay Webhook] order_id=${orderId} status=${statusUpper} → ${normalizedStatus}`);

    // Find payment record
    const { data: paymentDocs, error: paymentError } = await supabaseServer
      .from('payments')
      .select('*')
      .eq('order_id', orderId);

    if (paymentError || !paymentDocs || paymentDocs.length === 0) {
      console.error('❌ HarakaPay Webhook: Payment not found for order_id:', orderId);
      return NextResponse.json({ success: false, message: 'Payment not found' });
    }

    const paymentDoc = paymentDocs[0];
    const paymentId  = paymentDoc.id;

    console.log('📋 Payment found:', { paymentId, currentStatus: paymentDoc.status, orderId });

    // Skip if already completed by a webhook (not admin)
    if (
      paymentDoc.status === 'completed' &&
      paymentDoc.completed_by &&
      !paymentDoc.completed_by.startsWith('admin:')
    ) {
      console.log('✅ Already completed, skipping');
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Get the user
    const { data: userData, error: userError } = await supabaseServer
      .from('rahapremium_users')
      .select('*')
      .eq('id', paymentDoc.user_id)
      .single();

    if (userError || !userData) {
      console.error('❌ HarakaPay Webhook: User not found:', paymentDoc.user_id);
      return NextResponse.json({ success: false, message: 'User not found' });
    }

    // ── SECURITY: Verify phone number matches ─────────────────────────────────
    // The payment's phone_number must match the account's registered phone_number.
    // This prevents a payment made by one phone from being credited to an account
    // that registered later with the same number.
    const paymentPhone = (paymentDoc.phone_number || '').replace(/\s+/g, '').replace(/^\+255/, '0').replace(/^255/, '0');
    const accountPhone = (userData.phone_number   || '').replace(/\s+/g, '').replace(/^\+255/, '0').replace(/^255/, '0');

    if (paymentPhone && accountPhone && paymentPhone !== accountPhone) {
      console.error(
        `❌ HarakaPay Webhook: Phone mismatch — payment phone=${paymentPhone} account phone=${accountPhone}. Refusing to apply.`
      );
      await supabaseServer.from('payments').update({ status: 'failed', completed_by: 'phone-mismatch' }).eq('id', paymentId);
      return NextResponse.json({ success: false, message: 'Phone number mismatch — payment not applied' });
    }
    // ─────────────────────────────────────────────────────────────────────────

    const user: User = {
      ...userData,
      uid:             userData.id,
      phoneNumber:     userData.phone_number,
      displayName:     userData.display_name,
      profilePhotoURL: userData.profile_photo_url,
      isBlocked:       userData.is_blocked,
      isAdult:         userData.is_adult,
      createdAt:       toDate(userData.created_at),
      lastLoginAt:     toDate(userData.last_login_at),
      subscription:    userData.subscription,
      subscriptionHistory: userData.subscription_history || [],
      paymentHistory:  userData.payment_history || [],
      contentAccesses: userData.content_accesses || [],
    };

    if (normalizedStatus === 'COMPLETED') {
      console.log('🎉 HarakaPay: processing completed payment...');

      const paymentType = paymentDoc.payment_type || 'subscription';

      // Mark payment completed
      await supabaseServer.from('payments').update({
        status:                'completed',
        is_manually_completed: false,
        completed_at:          new Date().toISOString(),
        completed_by:          'harakapay-webhook',
      }).eq('id', paymentId);

      // Update user payment history
      const updatedHistory = (user.paymentHistory || []).map((p: any) =>
        p.id === paymentId
          ? { ...p, status: 'completed' as PaymentStatus, isManuallyCompleted: false, completedAt: new Date() }
          : p
      );
      const updatePayload: any = {
        payment_history: JSON.parse(JSON.stringify(updatedHistory)),
      };

      if (paymentType === 'game') {
        const access = {
          id:             crypto.randomUUID(),
          game_id:        paymentDoc.game_id,
          user_id:        user.uid,
          start_date:     new Date().toISOString(),
          end_date:       new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          is_active:      true,
          transaction_id: paymentId,
          created_at:     new Date().toISOString(),
        };
        await supabaseServer.from('game_accesses').insert(access);
        await supabaseServer.from('rahapremium_users').update(updatePayload).eq('id', user.uid);

      } else if (paymentType === 'content') {
        const updatedAccesses = [...(user.contentAccesses || []), paymentDoc.content_id];
        updatePayload.content_accesses = updatedAccesses;
        await supabaseServer.from('rahapremium_users').update(updatePayload).eq('id', user.uid);

      } else {
        // Subscription
        await supabaseServer.from('rahapremium_users').update(updatePayload).eq('id', user.uid);

        const packageType = paymentDoc.package_type;
        const isLiveTv = paymentDoc.package_category === 'LIVETV';
        const settingsId = isLiveTv ? 'packages_livetv' : 'packages';
        const packagesConfigRes = await supabaseServer
          .from('settings')
          .select('data')
          .eq('id', settingsId)
          .single();

        let packagesConfig: any = {
          FEDHA:   { days: 3,   price: 5000,   name: 'FEDHA' },
          CHUMA:   { days: 7,   price: 8000,   name: 'CHUMA' },
          DHAHABU: { days: 14,  price: 15000,  name: 'DHAHABU' },
          ALMASI:  { days: 30,  price: 25000,  name: 'ALMASI' },
          MALKIA:  { days: 180, price: 120000, name: 'MALKIA' },
        };
        if (!packagesConfigRes.error && packagesConfigRes.data?.data) {
          packagesConfig = { ...packagesConfig, ...packagesConfigRes.data.data };
        }

        // Operate on the subscription belonging to this category only.
        const currentSub: any = isLiveTv ? userData.live_tv_subscription : user.subscription;
        const currentSubHistory: any[] = isLiveTv
          ? (userData.live_tv_subscription_history || [])
          : (user.subscriptionHistory || []);

        const packageConfig = packagesConfig[packageType];
        const now           = new Date();
        const hierarchy     = ['FEDHA', 'CHUMA', 'DHAHABU', 'ALMASI', 'MALKIA'];
        const isUpgrade =
          currentSub?.isActive &&
          hierarchy.indexOf(packageType) > hierarchy.indexOf(currentSub.packageType);
        const isRenewal =
          currentSub?.packageType === packageType && currentSub?.isActive;

        let endDate: Date;
        if (isRenewal && currentSub?.isActive) {
          endDate = new Date(new Date(currentSub.endDate).getTime() + packageConfig.days * 86400000);
        } else if (isUpgrade && currentSub) {
          endDate = new Date(new Date(currentSub.endDate).getTime() + packageConfig.days * 86400000);
        } else if (currentSub?.isActive) {
          const remaining = new Date(currentSub.endDate).getTime() - now.getTime();
          endDate = new Date(now.getTime() + remaining + packageConfig.days * 86400000);
        } else {
          endDate = new Date(now.getTime() + packageConfig.days * 86400000);
        }

        const newSubscription = {
          id:              `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          packageType,
          startDate:       now,
          endDate,
          isActive:        true,
          transactionId:   paymentId,
          amount:          packageConfig.price,
          isRenewal:       !!isRenewal,
          isUpgrade:       !!isUpgrade,
          previousPackage: currentSub?.packageType || null,
          createdAt:       now,
          category:        isLiveTv ? 'LIVETV' : 'GENERAL',
        };

        const updatedSubHistory = [...currentSubHistory, newSubscription].map((s: any) =>
          s.id === currentSub?.id ? { ...s, isActive: false } : s
        );

        const subUpdatePayload = isLiveTv
          ? {
              live_tv_subscription:         JSON.parse(JSON.stringify(newSubscription)),
              live_tv_subscription_history: JSON.parse(JSON.stringify(updatedSubHistory)),
            }
          : {
              subscription:         JSON.parse(JSON.stringify(newSubscription)),
              subscription_history: JSON.parse(JSON.stringify(updatedSubHistory)),
            };
        await supabaseServer.from('rahapremium_users').update(subUpdatePayload).eq('id', user.uid);
      }

      console.log('✅ HarakaPay Webhook: payment completed for', orderId);

    } else if (normalizedStatus === 'FAILED' || normalizedStatus === 'FAIL') {
      await supabaseServer.from('payments').update({ status: 'failed' }).eq('id', paymentId);
      const updatedHistory = (user.paymentHistory || []).map((p: any) =>
        p.id === paymentId ? { ...p, status: 'failed' as PaymentStatus } : p
      );
      await supabaseServer.from('rahapremium_users').update({
        payment_history: JSON.parse(JSON.stringify(updatedHistory)),
      }).eq('id', user.uid);
      console.log('❌ HarakaPay Webhook: payment failed for', orderId);
    } else {
      console.log(`⏳ HarakaPay Webhook: status=${normalizedStatus} not final, ignoring`);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });

  } catch (error: any) {
    console.error('❌ HarakaPay Webhook error:', error?.message);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
