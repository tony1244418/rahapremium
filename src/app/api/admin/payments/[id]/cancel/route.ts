import { NextRequest, NextResponse } from 'next/server';
import { failPaymentManually } from '@/lib/admin';
import { isManualPaymentsEnabled } from '@/lib/admin-settings';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await verifyAdminRequest(request);
    if (authError) return authError;

    const { reason } = await request.json();
    const { id: paymentId } = await params;

    if (!reason) {
      return NextResponse.json({
        success: false,
        error: 'Cancellation reason is required'
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

    await failPaymentManually(paymentId, reason);

    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel payment'
    }, { status: 500 });
  }
}
