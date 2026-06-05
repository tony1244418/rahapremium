/**
 * Payment Gateway Abstraction
 * Priority 1: HarakaPay  (USSD Push) — primary
 * Priority 2: ClickPesa  (USSD Push) — silent fallback on HarakaPay failure
 */
import axios from 'axios';

// ─── ClickPesa Config ────────────────────────────────────────────────────────
const CLICKPESA_API_BASE  = 'https://api.clickpesa.com/third-parties';
const CLICKPESA_CLIENT_ID = process.env.CLICKPESA_CLIENT_ID || 'IDDZKYbOWmFE0PNcMamsM8ZuxKGveNEG';
const CLICKPESA_API_KEY   = process.env.CLICKPESA_API_KEY   || 'SKJ9YXhwQHx2NJaquQCQVHJo52ajFxiVPFzLXAZtlg';

// The registered origin for this ClickPesa application
const CLICKPESA_ORIGIN = 'https://eastsay.net';

// Webhook URL ClickPesa calls when payment status changes
const CLICKPESA_CALLBACK_URL =
  process.env.CLICKPESA_CALLBACK_URL ||
  (process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/clickpesa`
    : 'https://www.rahapremium.com/api/webhook/clickpesa');

// ─── HarakaPay Config ─────────────────────────────────────────────────────────
const HARAKAPAY_API_BASE = 'https://harakapay.net/api/v1';
const HARAKAPAY_API_KEY  =
  process.env.HARAKAPAY_API_KEY || 'hpk_046ea9438f16e1ac82cacde860b3be51c660fcd2f71230f0';

// Optional webhook URL for HarakaPay callbacks
const HARAKAPAY_WEBHOOK_URL =
  process.env.HARAKAPAY_WEBHOOK_URL ||
  (process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/harakapay`
    : 'https://www.rahapremium.com/api/webhook/harakapay');



// ─── Types ────────────────────────────────────────────────────────────────────
export type GatewayResult = {
  success: boolean;
  message: string;
  orderId: string;
  ussdCode?: string;
  phoneNumber: string;
  amount: number;
  gateway: 'clickpesa' | 'harakapay';
};

export type StatusResult = {
  status: 'success' | 'error';
  order_id: string;
  payment_status: string; // COMPLETED | SUCCESS | SETTLED | FAILED | PENDING | PROCESSING
  message: string;
  amount?: string | number;
  channel?: string;
  reference?: string;
  gateway: 'clickpesa' | 'harakapay';
};

// ─── ClickPesa Token Cache ────────────────────────────────────────────────────
// Tokens are valid 1 hour — cache for 55 min to avoid per-request generation
let _cpToken: string | null = null;
let _cpTokenExpiry = 0;

async function getClickPesaToken(): Promise<string> {
  const now = Date.now();
  if (_cpToken && now < _cpTokenExpiry) return _cpToken;

  const resp = await axios.post(
    `${CLICKPESA_API_BASE}/generate-token`,
    {},
    {
      headers: {
        'client-id': CLICKPESA_CLIENT_ID,
        'api-key':   CLICKPESA_API_KEY,
        'Origin':    CLICKPESA_ORIGIN,
        'Referer':   `${CLICKPESA_ORIGIN}/`,
      },
      timeout: 15000,
    }
  );

  if (!resp.data?.token) throw new Error('ClickPesa: token missing in response');

  _cpToken = resp.data.token as string;
  _cpTokenExpiry = now + 55 * 60 * 1000; // 55 minutes
  return _cpToken;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert 07XXXXXXXX → 255XXXXXXXXX for ClickPesa */
function toClickPesaPhone(phone: string): string {
  if (phone.startsWith('0'))  return '255' + phone.slice(1);
  if (phone.startsWith('+'))  return phone.slice(1);
  return phone;
}

/**
 * ClickPesa requires orderReference to be alphanumeric only AND ≤ 20 characters.
 * Strategy: strip non-alphanumeric then take LAST 20 chars (most unique part is at the end).
 */
function toClickPesaOrderRef(orderId: string): string {
  const clean = orderId.replace(/[^a-zA-Z0-9]/g, '');
  return clean.slice(-20); // last 20 chars — most entropy is at the end
}

/**
 * Generate a short, unique ClickPesa orderReference starting with "C".
 * Format: C + 3 random uppercase letters + base36(timestamp last 6 digits) + 4 random uppercase alphanumeric
 * Example: CPMOT2GRR855  (always ≤ 20 chars, always starts with C)
 */
function generateClickPesaRef(): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) =>
    Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  const tsPart = Date.now().toString(36).toUpperCase().slice(-6); // last 6 of base36 timestamp
  return 'C' + rand(3) + tsPart + rand(4); // e.g. CPMOT2GRR855 (14 chars)
}

// ─── ClickPesa: Initiate ──────────────────────────────────────────────────────

async function initiateClickPesa(
  orderId: string,
  phoneNumber: string,
  amount: number,
  _buyerName: string
): Promise<GatewayResult> {
  const token    = await getClickPesaToken();
  const orderRef = generateClickPesaRef(); // short unique ref starting with C

  const payload = {
    amount:         String(amount),
    currency:       'TZS',
    orderReference: orderRef,
    phoneNumber:    toClickPesaPhone(phoneNumber),
    callbackUrl:    CLICKPESA_CALLBACK_URL,
  };

  console.log('[ClickPesa] Initiating USSD push:', JSON.stringify(payload));

  const resp = await axios.post(
    `${CLICKPESA_API_BASE}/payments/initiate-ussd-push-request`,
    payload,
    {
      headers: {
        'Authorization': token,
        'Content-Type':  'application/json',
        'Origin':        CLICKPESA_ORIGIN,
        'Referer':       `${CLICKPESA_ORIGIN}/`,
      },
      timeout: 30000,
    }
  );

  console.log('[ClickPesa] Response:', JSON.stringify(resp.data));

  const resStatus = (resp.data?.status || '').toUpperCase();

  if (resStatus === 'PROCESSING' || resStatus === 'SUCCESS' || resStatus === 'SETTLED') {
    return {
      success:  true,
      message:  'USSD push sent. Please check your phone and enter your PIN.',
      orderId:  resp.data?.orderReference || orderRef,
      ussdCode: '*150*00#',
      phoneNumber,
      amount,
      gateway:  'clickpesa',
    };
  }

  throw new Error(
    `ClickPesa unexpected status: ${resp.data?.status} — ${resp.data?.message || ''}`
  );
}

// ─── HarakaPay: Initiate ──────────────────────────────────────────────────────

async function initiateHarakaPay(
  orderId: string,
  phoneNumber: string,
  amount: number,
  _buyerName: string
): Promise<GatewayResult> {
  const payload = {
    phone:       phoneNumber,
    amount,
    description: `Payment ${orderId}`,
    webhook_url: HARAKAPAY_WEBHOOK_URL,
  };

  console.log('[HarakaPay] Initiating USSD push:', JSON.stringify(payload));

  const resp = await axios.post(
    `${HARAKAPAY_API_BASE}/collect`,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key':    HARAKAPAY_API_KEY,
      },
      timeout: 30000,
    }
  );

  console.log('[HarakaPay] Response:', JSON.stringify(resp.data));

  if (resp.data?.success === true) {
    return {
      success:  true,
      message:  resp.data.message || 'USSD push sent. Please check your phone and enter your PIN.',
      orderId:  resp.data.order_id || orderId,
      ussdCode: '*150*00#',
      phoneNumber,
      amount,
      gateway:  'harakapay',
    };
  }

  throw new Error(
    resp.data?.error || resp.data?.message || 'HarakaPay payment initiation failed'
  );
}


// ─── Public: Initiate Payment ─────────────────────────────────────────────────

/**
 * Payment waterfall:
 *   1. HarakaPay  — primary
 *   2. ClickPesa  — silent fallback if HarakaPay fails
 *
 * The user never sees which gateway was used.
 */
export async function initiatePayment(
  orderId: string,
  phoneNumber: string,
  amount: number,
  buyerName: string
): Promise<GatewayResult> {
  // ── 1. Try HarakaPay ─────────────────────────────────────────────────────
  try {
    const result = await initiateHarakaPay(orderId, phoneNumber, amount, buyerName);
    console.log('[Gateway] Payment initiated via HarakaPay');
    return result;
  } catch (err: any) {
    console.warn(
      '[Gateway] HarakaPay failed — switching to ClickPesa. Reason:',
      err?.response?.data || err?.message
    );
  }

  // ── 2. Try ClickPesa ──────────────────────────────────────────────────────
  try {
    const result = await initiateClickPesa(orderId, phoneNumber, amount, buyerName);
    console.log('[Gateway] Payment initiated via ClickPesa (fallback)');
    return result;
  } catch (err: any) {
    console.warn(
      '[Gateway] ClickPesa failed.',
      err?.response?.data || err?.message
    );
    // Invalidate cached token so next ClickPesa attempt gets a fresh one
    _cpToken = null;
    _cpTokenExpiry = 0;
    throw new Error('All payment gateways failed. Please try again later.');
  }
}

// ─── Public: Query Payment Status ─────────────────────────────────────────────

/**
 * Query payment status.
 * Tries HarakaPay first, then ClickPesa.
 */
export async function queryPaymentStatus(
  orderId: string,
  gateway?: 'clickpesa' | 'harakapay'
): Promise<StatusResult> {
  const orderRef    = toClickPesaOrderRef(orderId);
  const forceClickP = gateway === 'clickpesa';

  // ── 1. Try HarakaPay ─────────────────────────────────────────────────────
  if (!forceClickP) {
    try {
      const resp = await axios.get(
        `${HARAKAPAY_API_BASE}/status/${encodeURIComponent(orderId)}`,
        {
          headers: { 'X-API-Key': HARAKAPAY_API_KEY },
          timeout: 30000,
        }
      );

      console.log('[HarakaPay] Status response:', JSON.stringify(resp.data));

      if (resp.data?.success === true && resp.data?.payment) {
        const payment = resp.data.payment;
        const rawStatus = (payment.status || 'PENDING').toUpperCase();
        const normalizedStatus =
          rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS' ? 'COMPLETED' : rawStatus;

        return {
          status:         'success',
          order_id:       payment.order_id || orderId,
          payment_status: normalizedStatus,
          message:        `HarakaPay: ${normalizedStatus}`,
          amount:         payment.amount,
          gateway:        'harakapay',
        };
      }
    } catch (err: any) {
      console.warn(
        '[Gateway] HarakaPay status check failed — trying ClickPesa:',
        err?.response?.data || err?.message
      );
    }
  }

  // ── 2. Try ClickPesa ──────────────────────────────────────────────────────
  try {
    const token = await getClickPesaToken();
    const resp  = await axios.get(
      `${CLICKPESA_API_BASE}/payments/${encodeURIComponent(orderRef)}`,
      {
        headers: {
          'Authorization': token,
          'Origin':        CLICKPESA_ORIGIN,
          'Referer':       `${CLICKPESA_ORIGIN}/`,
        },
        timeout: 30000,
      }
    );

    console.log('[ClickPesa] Status response:', JSON.stringify(resp.data));

    const data = Array.isArray(resp.data) ? resp.data[0] : resp.data;
    if (data) {
      const rawStatus = (data.status || 'PENDING').toUpperCase();
      const normalizedStatus =
        rawStatus === 'SUCCESS' || rawStatus === 'SETTLED' ? 'COMPLETED' : rawStatus;

      return {
        status:         'success',
        order_id:       data.orderReference || orderRef,
        payment_status: normalizedStatus,
        message:        data.message || rawStatus,
        amount:         data.collectedAmount,
        channel:        data.channel,
        reference:      data.paymentReference,
        gateway:        'clickpesa',
      };
    }
  } catch (err: any) {
    console.warn(
      '[Gateway] ClickPesa status check failed:',
      err?.response?.data || err?.message
    );
    if (err?.response?.status === 401) {
      _cpToken = null;
      _cpTokenExpiry = 0;
    }
  }

  // If both failed or not found
  return {
    status:         'error',
    order_id:       orderId,
    payment_status: 'UNKNOWN',
    message:        'Failed to retrieve payment status',
    gateway:        'harakapay',
  };
}
