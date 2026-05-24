import { NextRequest, NextResponse } from 'next/server';
import { completePaymentManually } from '@/lib/admin';
import { isManualPaymentsEnabled } from '@/lib/admin-settings';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { adminId } = await request.json();
    const { id: paymentId } = await params;

    console.log('Payment completion request:', { paymentId, adminId });

    if (!adminId) {
      return NextResponse.json({
        success: false,
        error: 'Admin ID is required'
      }, { status: 400 });
    }

    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID is required'
      }, { status: 400 });
    }

    const manualPaymentsEnabled = await isManualPaymentsEnabled();

    if (!manualPaymentsEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Manual payment approvals are disabled in system settings'
        },
        { status: 403 }
      );
    }

    // First, check if the payment exists
    const { getPaymentById } = await import('@/lib/admin');
    const payment = await getPaymentById(paymentId);
    
    if (!payment) {
      console.error('Payment not found:', paymentId);
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      }, { status: 404 });
    }

    console.log('Payment found:', payment);

    await completePaymentManually(paymentId, adminId);

    return NextResponse.json({
      success: true,
      message: 'Payment completed successfully'
    });

  } catch (error) {
    console.error('Error completing payment:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to complete payment'
    }, { status: 500 });
  }
}
