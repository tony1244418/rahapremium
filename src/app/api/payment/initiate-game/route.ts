import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment } from '@/lib/payment-gateway';

export async function POST(request: NextRequest) {
  try {
    const { gameId, amount, phoneNumber, userId, buyerName, buyerEmail } = await request.json();

    if (!gameId || !amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Game ID, amount, and phone number are required' },
        { status: 400 }
      );
    }

    // Validate phone number format (Tanzania)
    if (!/^0[67][0-9]{8}$/.test(phoneNumber)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please enter a valid 10-digit phone number (06XXXXXXXX or 07XXXXXXXX)',
        },
        { status: 400 }
      );
    }

    const orderId = 'GAME_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

    console.log(`[/api/payment/initiate-game] gameId=${gameId} phone=${phoneNumber} amount=${amount}`);

    const result = await initiatePayment(orderId, phoneNumber, amount, buyerName || 'Customer', buyerEmail);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      orderId: result.orderId,
      ussdCode: result.ussdCode || '*150*00#',
      phoneNumber: result.phoneNumber,
      amount: result.amount,
      gateway: result.gateway,
    });
  } catch (error: any) {
    console.error('[/api/payment/initiate-game] Unhandled error:', error?.message);

    let errorMessage = 'Payment failed';
    if (error?.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout. Please try again.';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json({ success: false, message: errorMessage }, { status: 400 });
  }
}
