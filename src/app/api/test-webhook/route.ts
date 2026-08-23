import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { completePayment } from '@/lib/subscriptions';

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();
    
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Order ID required' 
      }, { status: 400 });
    }

    // Find the payment record by order ID
    const { data: rawPayments, error } = await supabaseServer
      .from('payments')
      .select('*')
      .eq('order_id', orderId);
    
    const payments = rawPayments as any[] | null;

    if (error || !payments || payments.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Payment not found' 
      }, { status: 404 });
    }

    const payment = payments[0];
    const paymentId = payment.id;
    
    console.log('🧪 Test webhook triggered for payment:', { paymentId, orderId, currentStatus: payment.status });

    if (payment.status === 'completed') {
      return NextResponse.json({ 
        success: true, 
        message: 'Payment already completed' 
      });
    }

    // Get user
    const { data: rawUsers } = await supabaseServer.from('rahapremium_users').select('*').eq('id', payment.user_id);
    const users = rawUsers as any[] | null;
    if (!users || users.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    const user = users[0];
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

    // Complete the payment
    await completePayment(paymentId, mappedUser, false, 'test-webhook');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payment completed successfully via test webhook' 
    });

  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
