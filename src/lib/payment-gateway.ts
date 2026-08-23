/**
 * Payment Gateway Abstraction
 * Priority 1: Pressso Pay (USSD Push) — primary
 * Priority 2: ClickPesa   (USSD Push) — silent fallback on Pressso failure
 */
import axios from 'axios';
import { createHmac, randomUUID } from 'crypto';

// ─── ClickPesa Config ────────────────────────────────────────────────────────
const CLICKPESA_API_BASE  = process.env.CLICKPESA_API_BASE || '';
const CLICKPESA_CLIENT_ID = process.env.CLICKPESA_CLIENT_ID || '';
const CLICKPESA_API_KEY   = process.env.CLICKPESA_API_KEY   || '';

// The registered origin for this ClickPesa application
const CLICKPESA_ORIGIN = process.env.CLICKPESA_ORIGIN || '';

// Webhook URL ClickPesa calls when payment status changes
const CLICKPESA_CALLBACK_URL =
  process.env.CLICKPESA_CALLBACK_URL ||
  (process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhook/clickpesa`
    : '');

// ─── Pressso Pay Config ────────────────────────────────────────────────────────
// Base URL and credentials come from server-side env vars. The SECRET must
// NEVER be exposed to the browser or committed — it lives in .env.local / the
// hosting environment only.
const PRESSSO_BASE       = process.env.PRESSSO_BASE_URL  || 'https://pressopay.com';
const PRESSSO_API_KEY    = process.env.PRESSSO_API_KEY    || '';    // pk_...
const PRESSSO_API_SECRET = process.env.PRESSSO_API_SECRET || '';    // sk_... (shown once at creation)

// ─── Types ────────────────────────────────────────────────────────────────────
export type PaymentGateway = 'clickpesa' | 'pressopay';

export type GatewayResult = {
  success: boolean;
  message: string;
  orderId: string;        // gateway reference we persist + poll status with
  ussdCode?: string;
  checkoutUrl?: string;   // Pressso fallback link (USSD push is automatic)
  phoneNumber: string;
  amount: number;
  gateway: PaymentGateway;
};

export type StatusResult = {
  status: 'success' | 'error';
  order_id: string;
  payment_status: string; // COMPLETED | SUCCESS | SETTLED | FAILED | PENDING | PROCESSING | CANCELLED
  message: string;
  amount?: string | number;
  channel?: string;
  reference?: string;
  gateway: PaymentGateway;
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
 * Example: CPMOT2GRR855  (always ≤ 20 chars, always starts with C)
 */
function generateClickPesaRef(): string {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand = (n: number) =>
    Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
  const tsPart = Date.now().toString(36).toUpperCase().slice(-6); // last 6 of base36 timestamp
  return 'C' + rand(3) + tsPart + rand(4); // e.g. CPMOT2GRR855 (14 chars)
}

// ─── Pressso: HMAC signing ──────────────────────────────────────────────────
/**
 * Lowercase-hex HMAC-SHA256 of five lines joined by a single newline:
 * timestamp, nonce, uppercase HTTP method, request path, and the EXACT raw
 * JSON body (empty string for GET).
 */
function presssoSign(
  timestamp: string,
  nonce: string,
  method: string,
  path: string,
  rawBody: string
): string {
  const canonical = [timestamp, nonce, method.toUpperCase(), path, rawBody].join('\n');
  return createHmac('sha256', PRESSSO_API_SECRET).update(canonical).digest('hex');
}

// ─── Pressso: Initiate ────────────────────────────────────────────────────────

async function initiatePressso(
  orderId: string,
  phoneNumber: string,
  amount: number,
  buyerName: string,
  buyerEmail?: string
): Promise<GatewayResult> {
  if (!PRESSSO_API_KEY || !PRESSSO_API_SECRET) {
    throw new Error('Pressso credentials are not configured');
  }

  const path      = '/api/v1/checkouts';
  const timestamp = new Date().toISOString();
  const nonce     = randomUUID();

  // Pressso requires buyerEmail. Our users register by phone (no email), so
  // fall back to a synthetic but valid-format address derived from the phone.
  const emailValid = buyerEmail && /^\S+@\S+\.\S+$/.test(buyerEmail);
  // Strip port (e.g. "localhost:3000" → "localhost") and ensure it looks like a real domain.
  const rawDomain = process.env.NEXT_PUBLIC_EMAIL_DOMAIN || process.env.NEXT_PUBLIC_CANONICAL_HOST || '';
  const domainNoPort = rawDomain.split(':')[0].replace(/[^a-zA-Z0-9.-]/g, '') || 'noreply.rahapremium.com';
  // "localhost" is not a valid TLD for email — use a safe fallback in dev.
  const emailDomain = domainNoPort === 'localhost' || !domainNoPort.includes('.') ? 'noreply.rahapremium.com' : domainNoPort;
  const email = emailValid
    ? (buyerEmail as string)
    : `user${phoneNumber.replace(/\D/g, '')}@${emailDomain}`;

  // amountMinor for TZS is whole shillings (TZS has no sub-unit in practice).
  const rawBody = JSON.stringify({
    merchantReference: orderId,                 // our unique order id
    amountMinor:       Math.round(amount),      // whole TZS
    buyerName:         buyerName || 'Customer',
    buyerEmail:        email,
    buyerPhone:        phoneNumber,
    description:       `Payment ${orderId}`,
  });

  const signature = presssoSign(timestamp, nonce, 'POST', path, rawBody);

  console.log('[Pressso] Initiating checkout:', rawBody);

  const resp = await axios.post(`${PRESSSO_BASE}${path}`, rawBody, {
    headers: {
      'Content-Type':        'application/json',
      'Idempotency-Key':     randomUUID(),
      'X-Pressso-Key':       PRESSSO_API_KEY,
      'X-Pressso-Timestamp': timestamp,
      'X-Pressso-Nonce':     nonce,
      'X-Pressso-Signature': signature,
    },
    timeout: 30000,
    // Don't throw on 4xx so we can log the full response body
    validateStatus: () => true,
  });

  console.log(`[Pressso] HTTP ${resp.status} Response:`, JSON.stringify(resp.data));

  if (resp.status >= 400) {
    const d = resp.data || {};
    // Pressso may return { errors: [{ field, message }] } or { message: '...' }
    const errMsg =
      (Array.isArray(d.errors) && d.errors.length > 0
        ? d.errors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ')
        : null) ||
      d.message ||
      d.error ||
      `HTTP ${resp.status}`;
    throw new Error(errMsg);
  }

  // { reference, merchantReference, status, checkoutUrl }
  const data      = resp.data || {};
  const reference = data.reference;
  const status    = (data.status || '').toUpperCase();

  if (reference && status !== 'FAILED' && status !== 'CANCELLED') {
    return {
      success:     true,
      message:     'USSD push sent. Please check your phone and enter your PIN.',
      orderId:     reference,
      ussdCode:    '*150*00#',
      checkoutUrl: data.checkoutUrl,
      phoneNumber,
      amount,
      gateway:     'pressopay',
    };
  }

  const failMsg = Array.isArray(data.errors) && data.errors.length > 0
    ? data.errors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ')
    : (data.message || data.error || `status=${data.status}`);
  throw new Error(`Pressso: ${failMsg}`);
}

// ─── ClickPesa: Initiate ──────────────────────────────────────────────────────

async function initiateClickPesa(
  orderId: string,
  phoneNumber: string,
  amount: number,
  _buyerName: string
): Promise<GatewayResult> {
  if (!CLICKPESA_CLIENT_ID || !CLICKPESA_API_KEY) {
    throw new Error('ClickPesa credentials are not configured');
  }

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

// ─── Public: Initiate Payment ─────────────────────────────────────────────────

/**
 * Payment waterfall:
 *   1. Pressso Pay — primary
 *   2. ClickPesa   — silent fallback if Pressso fails
 *
 * The user never sees which gateway was used.
 */
/** Extract a readable reason from an axios/gateway error. */
function gatewayErrorReason(err: any): string {
  // Pressso/ClickPesa 4xx: extract validation errors array if present
  const data = err?.response?.data;
  if (data) {
    if (typeof data === 'string') return data;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e: any) => `${e.field ? e.field + ': ' : ''}${e.message}`).join(', ');
    }
    return data.error || data.message || JSON.stringify(data);
  }
  // If we already threw a plain Error (e.g. from validateStatus path), use its message
  return err?.message || 'unknown error';
}

export async function initiatePayment(
  orderId: string,
  phoneNumber: string,
  amount: number,
  buyerName: string,
  buyerEmail?: string
): Promise<GatewayResult> {
  const reasons: string[] = [];

  // ── 1. Try Pressso ─────────────────────────────────────────────────────────
  try {
    const result = await initiatePressso(orderId, phoneNumber, amount, buyerName, buyerEmail);
    console.log('[Gateway] Payment initiated via Pressso');
    return result;
  } catch (err: any) {
    const reason = gatewayErrorReason(err);
    reasons.push(`Pressso: ${reason}`);
    console.warn('[Gateway] Pressso failed — switching to ClickPesa. Reason:', reason);
  }

  // ── 2. Try ClickPesa ──────────────────────────────────────────────────────
  try {
    const result = await initiateClickPesa(orderId, phoneNumber, amount, buyerName);
    console.log('[Gateway] Payment initiated via ClickPesa (fallback)');
    return result;
  } catch (err: any) {
    const reason = gatewayErrorReason(err);
    reasons.push(`ClickPesa: ${reason}`);
    console.warn('[Gateway] ClickPesa failed.', reason);
    // Invalidate cached token so next ClickPesa attempt gets a fresh one
    _cpToken = null;
    _cpTokenExpiry = 0;
    throw new Error(`All payment gateways failed. ${reasons.join(' | ')}`);
  }
}

// ─── Pressso: Query status ────────────────────────────────────────────────────

async function queryPresssoStatus(reference: string): Promise<StatusResult | null> {
  if (!PRESSSO_API_KEY || !PRESSSO_API_SECRET) return null;

  const path      = `/api/v1/payments/${reference}`;
  const timestamp = new Date().toISOString();
  const nonce     = randomUUID();
  const signature = presssoSign(timestamp, nonce, 'GET', path, ''); // empty body for GET

  const resp = await axios.get(`${PRESSSO_BASE}${path}`, {
    headers: {
      'X-Pressso-Key':       PRESSSO_API_KEY,
      'X-Pressso-Timestamp': timestamp,
      'X-Pressso-Nonce':     nonce,
      'X-Pressso-Signature': signature,
    },
    timeout: 30000,
  });

  console.log('[Pressso] Status response:', JSON.stringify(resp.data));

  const data      = resp.data || {};
  const rawStatus = (data.status || 'PENDING').toUpperCase();

  return {
    status:         'success',
    order_id:       data.reference || reference,
    payment_status: rawStatus, // PENDING | COMPLETED | FAILED | CANCELLED
    message:        `Pressso: ${rawStatus}`,
    amount:         data.amountMinor ?? data.amount,
    reference:      data.reference || reference,
    gateway:        'pressopay',
  };
}

// ─── Public: Query Payment Status ─────────────────────────────────────────────

/**
 * Query payment status.
 * Tries Pressso first (unless the caller forces ClickPesa), then ClickPesa.
 */
export async function queryPaymentStatus(
  orderId: string,
  gateway?: PaymentGateway
): Promise<StatusResult> {
  const orderRef    = toClickPesaOrderRef(orderId);
  const forceClickP = gateway === 'clickpesa';

  // ── 1. Try Pressso ─────────────────────────────────────────────────────────
  if (!forceClickP) {
    try {
      const result = await queryPresssoStatus(orderId);
      if (result) return result;
    } catch (err: any) {
      console.warn(
        '[Gateway] Pressso status check failed — trying ClickPesa:',
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
    gateway:        gateway || 'pressopay',
  };
}
