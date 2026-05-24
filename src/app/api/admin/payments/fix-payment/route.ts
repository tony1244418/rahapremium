import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { completePayment } from '@/lib/subscriptions';
import { normalizePhoneNumber } from '@/lib/admin';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { paymentPhone, userPhone, amount } = await request.json();
    
    if (!paymentPhone || !userPhone) {
      return NextResponse.json({
        success: false,
        error: 'Payment phone number and user phone number are required'
      }, { status: 400 });
    }
    
    const normalizedPaymentPhone = normalizePhoneNumber(paymentPhone);
    const normalizedUserPhone = normalizePhoneNumber(userPhone);
    
    // Find payment
    let paymentQuery = supabaseServer.from('payments').select('*').eq('phone_number', paymentPhone);
    if (amount) paymentQuery = paymentQuery.eq('amount', amount);
    
    let { data: payments } = await paymentQuery;
    
    if (!payments || payments.length === 0) {
      let normalizedQuery = supabaseServer.from('payments').select('*').eq('phone_number', normalizedPaymentPhone);
      if (amount) normalizedQuery = normalizedQuery.eq('amount', amount);
      const res = await normalizedQuery;
      payments = res.data;
    }
    
    if (!payments || payments.length === 0) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }
    
    const payment = payments[0];
    const paymentId = payment.id;
    
    // Find user
    let { data: users } = await supabaseServer.from('rahapremium_users').select('*').eq('phone_number', userPhone);
    if (!users || users.length === 0) {
      const res = await supabaseServer.from('rahapremium_users').select('*').eq('phone_number', normalizedUserPhone);
      users = res.data;
    }
    
    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: `User not found for phone number: ${userPhone}` }, { status: 404 });
    }
    
    const user = users[0];
    
    // Map user from DB to User type required by completePayment
    const mappedUser = {
      ...user,
      uid: user.id,
      phoneNumber: user.phone_number,
      displayName: user.display_name,
      username: user.username,
      profilePhotoURL: user.profile_photo_url,
      isBlocked: user.is_blocked,
      isAdult: user.is_adult,
      createdAt: new Date(user.created_at),
      lastLoginAt: user.last_login_at ? new Date(user.last_login_at) : new Date(),
      subscription: user.subscription,
      subscriptionHistory: user.subscription_history || [],
      paymentHistory: user.payment_history || [],
      contentAccesses: user.content_accesses || [],
    };
    
    // Update payment with correct userId if needed
    if (payment.user_id !== user.id) {
      await supabaseServer.from('payments').update({ user_id: user.id }).eq('id', paymentId);
    }
    
    // If payment is completed but game access doesn't exist, create it
    if (payment.status === 'completed' && payment.game_id) {
      const { data: accesses } = await supabaseServer.from('game_accesses')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_id', payment.game_id)
        .eq('is_active', true);
        
      if (!accesses || accesses.length === 0) {
        // Re-process the payment to create game access
        await supabaseServer.from('payments').update({ status: 'pending' }).eq('id', paymentId);
        await completePayment(paymentId, mappedUser, false, 'api-fix');
      }
    } else if (payment.status === 'pending') {
      // If payment is still pending, complete it
      await completePayment(paymentId, mappedUser, false, 'api-fix');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Payment fixed successfully',
      payment: {
        id: paymentId,
        userId: user.id,
        status: payment.status,
        gameId: payment.game_id
      }
    });
    
  } catch (error) {
    console.error('Error fixing payment:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix payment'
    }, { status: 500 });
  }
}
