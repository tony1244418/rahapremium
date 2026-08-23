import { NextRequest, NextResponse } from 'next/server';
import { initiatePayment } from '@/lib/payment-gateway';

export async function POST(request: NextRequest) {
  try {
    const { packageType, phoneNumber, buyerName, buyerEmail, category } = await request.json();

    if (!packageType || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Package type and phone number are required' },
        { status: 400 }
      );
    }

    const { getPackagesConfig, getLiveTvPackagesConfig } = await import('@/lib/subscriptions');
    const packagesConfig = category === 'LIVETV'
      ? await getLiveTvPackagesConfig()
      : await getPackagesConfig();
    const amount = packagesConfig[packageType as keyof typeof packagesConfig]?.price;

    if (!amount) {
      return NextResponse.json(
        { success: false, message: 'Invalid package type' },
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

    const orderId = 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);

    console.log(`[/api/payment/initiate] package=${packageType} phone=${phoneNumber} amount=${amount}`);

    const result = await initiatePayment(orderId, phoneNumber, amount, buyerName || 'Customer', buyerEmail);

    // Generate USSD code per package
    const ussdCodes: Record<string, string> = {
      FEDHA: '*150*00#',
      CHUMA: '*150*00#',
      DHAHABU: '*150*00#',
      ALMASI: '*150*00#',
      MALKIA: '*150*00#',
    };

    return NextResponse.json({
      success: result.success,
      message: result.message,
      orderId: result.orderId,
      ussdCode: ussdCodes[packageType] || result.ussdCode || '*150*00#',
      phoneNumber: result.phoneNumber,
      amount: result.amount,
      gateway: result.gateway,
    });
  } catch (error: any) {
    console.error('[/api/payment/initiate] Unhandled error:', error?.message);

    let errorMessage = 'Payment failed. Please try again.';
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
      errorMessage = 'Request timeout. Please check your connection and try again.';
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      errorMessage = 'Cannot reach payment service. Please try again later.';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        debug:
          process.env.NODE_ENV === 'development'
            ? { code: error?.code, msg: error?.message }
            : undefined,
      },
      { status: 500 }
    );
  }
}
