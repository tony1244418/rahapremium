import { NextRequest, NextResponse } from 'next/server';
import { queryPaymentStatus } from '@/lib/payment-gateway';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const gatewayHint = searchParams.get('gateway') as 'clickpesa' | 'pressopay' | null;

    if (!orderId) {
      return NextResponse.json(
        { status: 'error', message: 'Order ID required' },
        { status: 400 }
      );
    }

    console.log(`[/api/payment/status] Checking status for orderId=${orderId} gateway=${gatewayHint}`);

    const result = await queryPaymentStatus(orderId, gatewayHint || undefined);

    // If payment is completed, update our DB directly as a fallback
    if (
      result.status === 'success' &&
      (result.payment_status === 'COMPLETED' || result.payment_status === 'SUCCESS' || result.payment_status === 'SETTLED')
    ) {
      try {
        const { supabaseServer } = await import('@/lib/supabase-server');
        // Find the payment record by order ID
        const { data: rawPaymentDocs } = await supabaseServer
          .from('payments')
          .select('id')
          .eq('order_id', result.order_id);
          
        const paymentDocs = rawPaymentDocs as any[] | null;
        if (paymentDocs && paymentDocs.length > 0) {
          const paymentId = paymentDocs[0].id;
          
          // Only process if not already processed
          const { data: currentPayment } = await supabaseServer
            .from('payments')
            .select('status')
            .eq('id', paymentId)
            .single();
            
          if (currentPayment && (currentPayment as any).status !== 'completed') {
            console.log(`[status] Fallback: completing payment ${paymentId} manually via ${result.gateway} webhook`);
            // Call webhook internally to ensure all logic (content vs subscription) runs correctly
            const baseUrl = request.nextUrl.origin;
            const webhookPath = result.gateway === 'clickpesa' ? '/api/webhook/clickpesa' : '/api/webhook/pressopay';
            
            await fetch(`${baseUrl}${webhookPath}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                order_id: result.order_id,
                orderReference: result.order_id, // for clickpesa
                payment_status: result.payment_status,
                status: result.payment_status, // for clickpesa
                amount: result.amount,
                collectedAmount: result.amount, // for clickpesa
                phone_number: '',
              }),
            });
            console.log(`[status] Fallback webhook completed successfully`);
          }
        }
      } catch (e) {
        console.error('[status] Failed to trigger local fallback:', e);
      }
    }

    return NextResponse.json({
      status: result.status,
      order_id: result.order_id,
      message: result.message,
      payment_status: result.payment_status,
      amount: result.amount ?? 'N/A',
      channel: result.channel ?? 'N/A',
      reference: result.reference ?? 'N/A',
      gateway: result.gateway,
    });
  } catch (error: any) {
    console.error('[/api/payment/status] Unhandled error:', error?.message);
    return NextResponse.json(
      { status: 'error', message: 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
