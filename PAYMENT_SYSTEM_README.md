# RAHA Premium Payment System

## Overview
This document describes the dual-gateway payment system used in RAHA Premium, utilizing **ClickPesa** as the primary gateway and **HarakaPay** as the automatic fallback provider.

## System Architecture

### Components
1. **Next.js Frontend** - User interface for subscription selection and status polling.
2. **Payment Service (`src/lib/payment-gateway.ts`)** - Provider-agnostic logic that handles the ClickPesa -> HarakaPay waterfall.
3. **Firebase Firestore** - Database for tracking payment sessions, user subscriptions, and transaction metadata.
4. **ClickPesa API** - Primary mobile money gateway.
5. **HarakaPay API** - Secondary/Fallback mobile money gateway.

### Payment Flow (The Waterfall)
1. User selects a subscription package and provides their phone number.
2. The system attempts to initiate a USSD push via **ClickPesa**.
3. If ClickPesa succeeds:
   - The user completes the payment on their phone.
   - ClickPesa sends a webhook to `/api/webhook/clickpesa`.
4. If ClickPesa fails (e.g., API downtime or service error):
   - The system automatically falls back to **HarakaPay**.
   - HarakaPay sends a USSD push to the user.
   - HarakaPay sends a webhook to `/api/webhook/harakapay`.
5. Upon receiving a valid webhook, the system updates the payment status and activates the subscription.

## Configuration

### Environment Variables
The following keys are required in your `.env` or Vercel dashboard:
- `CLICKPESA_API_KEY`: Your ClickPesa production key.
- `HARAKAPAY_API_KEY`: Your HarakaPay production key.

### Webhook Endpoints
- **ClickPesa**: `https://your-domain.com/api/webhook/clickpesa`
- **HarakaPay**: `https://your-domain.com/api/webhook/harakapay`

## Admin Features

### Payment Monitoring
- The Admin Dashboard (`/admin/payments`) tracks all incoming transactions.
- **Gateway Detection**: The system identifies the provider using `order_id` prefixes:
  - `HP...` -> HarakaPay
  - `C...` -> ClickPesa
- **Manual Completion**: Admins can manually verify and complete payments if webhooks fail.

## Troubleshooting

### Common Issues
1. **No USSD Push Received**
   - Verify the phone number format (must be 10 digits starting with 0, e.g., 07XXXXXXXX).
   - Ensure the user has sufficient balance for the selected package.
   - Check if both ClickPesa and HarakaPay services are operational.

2. **Status Stuck at "Pending"**
   - Check the Admin Dashboard to see if the transaction reached the system.
   - Verify that webhooks are correctly configured in the ClickPesa/HarakaPay dashboards.
   - Ensure the server is reachable from external IPs (not firewalled).

## Security
1. **Signature Verification**: All webhooks should be verified to ensure they originate from the correct provider.
2. **Idempotency**: The system uses `order_id` to prevent duplicate subscription activations.
