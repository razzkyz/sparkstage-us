# SparkStage US - Architecture Overview

## System Architecture Comparison

### Indonesia Version (DOKU + RajaOngkir)

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Booking    │  │   Product    │  │    Admin     │    │
│  │    Pages     │  │   Checkout   │  │   Dashboard  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                  │             │
└─────────┼─────────────────┼──────────────────┼─────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Deno)                 │
│                                                             │
│  ┌───────────────────┐  ┌────────────────────┐            │
│  │  DOKU Checkout    │  │  RajaOngkir Proxy  │            │
│  │  ────────────────│  │  ─────────────────│            │
│  │  - Ticket         │  │  - Province API    │            │
│  │  - Product        │  │  - City API        │            │
│  │  - Webhook        │  │  - Cost API        │            │
│  └───────────────────┘  └────────────────────┘            │
│          │                       │                          │
└──────────┼───────────────────────┼──────────────────────────┘
           │                       │
           ▼                       ▼
    ┌──────────┐          ┌──────────────┐
    │   DOKU   │          │  RajaOngkir  │
    │   API    │          │     API      │
    └──────────┘          └──────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                Supabase Postgres Database                   │
│                                                             │
│  - orders (doku_order_id, doku_payment_url)                │
│  - order_products (doku_invoice_number)                    │
│  - purchased_tickets                                       │
│  - shipping (rajaongkir_service, rajaongkir_cost)         │
└─────────────────────────────────────────────────────────────┘
```

### US Version (Stripe + EasyPost)

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Booking    │  │   Product    │  │    Admin     │    │
│  │    Pages     │  │   Checkout   │  │   Dashboard  │    │
│  │              │  │              │  │              │    │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │              │    │
│  │ │  Stripe  │ │  │ │  Stripe  │ │  │              │    │
│  │ │ Elements │ │  │ │ Elements │ │  │              │    │
│  │ └──────────┘ │  │ └──────────┘ │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                  │             │
└─────────┼─────────────────┼──────────────────┼─────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Deno)                 │
│                                                             │
│  ┌───────────────────┐  ┌────────────────────┐            │
│  │ Stripe Checkout   │  │  Shipping Cost     │            │
│  │ ───────────────── │  │  ───────────────── │            │
│  │ - Ticket Intent   │  │  - EasyPost        │            │
│  │ - Product Intent  │  │  - USPS/FedEx/UPS  │            │
│  │ - Webhook Handler │  │  - Address Validate│            │
│  │ - Status Sync     │  │  - Rate Shopping   │            │
│  └───────────────────┘  └────────────────────┘            │
│          │                       │                          │
└──────────┼───────────────────────┼──────────────────────────┘
           │                       │
           ▼                       ▼
    ┌──────────┐          ┌──────────────┐
    │  Stripe  │          │   EasyPost   │
    │   API    │          │     API      │
    └──────────┘          └──────────────┘
           │                      │
           ▼                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Supabase Postgres Database                   │
│                                                             │
│  - orders (stripe_payment_intent_id, stripe_customer_id)   │
│  - order_products (stripe_client_secret)                   │
│  - purchased_tickets                                       │
│  - shipping (easypost_shipment_id, carrier, service)       │
└─────────────────────────────────────────────────────────────┘
```

## Payment Flow Sequence

### DOKU Payment Flow (Indonesia)

```
User          Frontend        Edge Func       DOKU API      Database
 │               │                │              │             │
 │───Select─────>│                │              │             │
 │   Tickets     │                │              │             │
 │               │                │              │             │
 │               │──Create────────>│              │             │
 │               │  Checkout      │              │             │
 │               │                │              │             │
 │               │                │──Create──────>│             │
 │               │                │  Order       │             │
 │               │                │              │             │
 │               │                │<─Payment─────│             │
 │               │                │  URL         │             │
 │               │                │              │             │
 │               │                │──Save────────────────────>│
 │               │                │  Order                    │
 │               │                │              │             │
 │               │<─Payment───────│              │             │
 │               │  URL           │              │             │
 │               │                │              │             │
 │<─Open Popup───│                │              │             │
 │  (Jokul SDK)  │                │              │             │
 │               │                │              │             │
 │──Complete─────────────────────────────────────>│             │
 │  Payment                       │              │             │
 │                                │              │             │
 │                                │<─Webhook─────│             │
 │                                │  SUCCESS     │             │
 │                                │              │             │
 │                                │──Update──────────────────>│
 │                                │  Status=paid              │
 │               │                │              │             │
 │<─Redirect─────│                │              │             │
 │  to Success   │                │              │             │
```

### Stripe Payment Flow (US)

```
User          Frontend        Edge Func       Stripe API    Database
 │               │                │              │             │
 │───Select─────>│                │              │             │
 │   Tickets     │                │              │             │
 │               │                │              │             │
 │               │──Create────────>│              │             │
 │               │  Intent        │              │             │
 │               │                │              │             │
 │               │                │──Create──────>│             │
 │               │                │  Payment     │             │
 │               │                │  Intent      │             │
 │               │                │              │             │
 │               │                │<─Client──────│             │
 │               │                │  Secret      │             │
 │               │                │              │             │
 │               │                │──Save────────────────────>│
 │               │                │  Order                    │
 │               │                │              │             │
 │               │<─Client────────│              │             │
 │               │  Secret        │              │             │
 │               │                │              │             │
 │<─Render───────│                │              │             │
 │  Stripe       │                │              │             │
 │  Elements     │                │              │             │
 │               │                │              │             │
 │──Enter Card───>│                │              │             │
 │  Details      │                │              │             │
 │               │                │              │             │
 │───Submit─────>│──Confirm───────────────────────>│             │
 │               │  Payment       │              │             │
 │               │                │              │             │
 │                                │<─Webhook─────│             │
 │                                │  succeeded   │             │
 │                                │              │             │
 │                                │──Update──────────────────>│
 │                                │  Status=paid              │
 │               │                │              │             │
 │<─Redirect─────│                │              │             │
 │  to Success   │                │              │             │
```

## Key Architectural Differences

### 1. Payment Integration

| Aspect | DOKU (Indonesia) | Stripe (US) |
|--------|------------------|-------------|
| **UI Integration** | External popup (Jokul SDK) | Embedded (Stripe Elements) |
| **Payment URL** | Server returns payment URL | Server returns client secret |
| **User Experience** | Popup → Pay → Close popup | Inline form → Submit |
| **Mobile Friendly** | Popup can be blocked | Always works (embedded) |

### 2. Webhook Security

**DOKU:**
```typescript
// Manual HMAC calculation
const signature = crypto
  .createHmac('sha256', CLIENT_ID + SECRET_KEY + timestamp)
  .update(body)
  .digest('hex')

if (signature !== requestSignature) {
  throw new Error('Invalid signature')
}
```

**Stripe:**
```typescript
// Built-in verification
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)
// Throws error if invalid
```

### 3. Database Schema Changes

**Tables to Update:**

```sql
-- orders table
ALTER TABLE orders
DROP COLUMN doku_order_id,
DROP COLUMN doku_invoice_number,
DROP COLUMN doku_payment_url,
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_client_secret TEXT;

-- order_products table
ALTER TABLE order_products
DROP COLUMN doku_order_id,
DROP COLUMN doku_invoice_number,
ADD COLUMN stripe_payment_intent_id TEXT,
ADD COLUMN stripe_customer_id TEXT;

-- shipping table (if exists)
ALTER TABLE shipping
DROP COLUMN rajaongkir_service,
DROP COLUMN rajaongkir_cost,
DROP COLUMN rajaongkir_etd,
ADD COLUMN easypost_shipment_id TEXT,
ADD COLUMN easypost_tracker_id TEXT,
ADD COLUMN carrier TEXT,
ADD COLUMN service TEXT,
ADD COLUMN tracking_number TEXT;
```

## Edge Functions Architecture

### Indonesia Version

```
supabase/functions/
├── create-doku-ticket-checkout/
│   └── index.ts (calls DOKU API)
├── create-doku-product-checkout/
│   └── index.ts (calls DOKU API)
├── doku-webhook/
│   └── index.ts (handles DOKU callbacks)
├── sync-doku-ticket-status/
│   └── index.ts (polls DOKU API)
├── sync-doku-product-status/
│   └── index.ts (polls DOKU API)
├── rajaongkir/
│   ├── province.ts
│   ├── city.ts
│   ├── subdistrict.ts
│   └── cost.ts
└── _shared/
    ├── doku-client.ts
    ├── rajaongkir-client.ts
    └── payment-effects.ts
```

### US Version

```
supabase/functions/
├── create-stripe-ticket-checkout/
│   └── index.ts (calls Stripe API)
├── create-stripe-product-checkout/
│   └── index.ts (calls Stripe API)
├── stripe-webhook/
│   └── index.ts (handles Stripe webhooks)
├── sync-stripe-payment-status/
│   └── index.ts (polls Stripe API)
├── calculate-shipping-cost/
│   └── index.ts (calls EasyPost)
├── validate-shipping-address/
│   └── index.ts (validates via EasyPost)
└── _shared/
    ├── stripe-client.ts
    ├── easypost-client.ts
    └── payment-effects.ts
```

## Frontend Component Structure

### Payment Page Evolution

**DOKU Version:**
```typescript
function PaymentPage() {
  // 1. Get payment URL from backend
  const { paymentUrl } = await createDokuCheckout()
  
  // 2. Open DOKU popup
  window.open(paymentUrl, '_blank', 'popup')
  
  // 3. Wait for callback
  // User closes popup manually
}
```

**Stripe Version:**
```typescript
function PaymentPage() {
  // 1. Get client secret from backend
  const { clientSecret } = await createStripeIntent()
  
  // 2. Render Stripe Elements
  return (
    <Elements stripe={stripe} options={{ clientSecret }}>
      <PaymentElement />
      <button onClick={handleSubmit}>Pay Now</button>
    </Elements>
  )
  
  // 3. Stripe handles everything inline
}
```

## Security Comparison

| Aspect | DOKU | Stripe |
|--------|------|--------|
| **PCI Compliance** | Merchant responsible | Stripe handles (SAQ-A) |
| **Card Storage** | Never store (PCI-DSS) | Never store (Stripe Vault) |
| **Webhook Verification** | Manual HMAC | Built-in verification |
| **3D Secure** | Optional | Automatic (SCA) |
| **Fraud Detection** | Basic | Advanced ML models |

## Performance Considerations

### DOKU Flow
- **2 server roundtrips:** Create order → Open popup
- **Popup load time:** 2-5 seconds
- **Total time to payment:** ~10-15 seconds

### Stripe Flow
- **1 server roundtrip:** Create intent
- **Elements load time:** <1 second (cached)
- **Total time to payment:** ~5-8 seconds

## Scalability

Both architectures scale horizontally:

```
Load Balancer
     │
     ├─── Frontend Instance 1 ────┐
     ├─── Frontend Instance 2 ────┤
     └─── Frontend Instance N ────┤
                                   │
                            Supabase Edge
                            (Auto-scaling)
                                   │
                            ┌──────┴──────┐
                            │             │
                      Stripe API    EasyPost API
                      (99.99% SLA)  (99.9% SLA)
```

## Cost at Scale

**Monthly costs for 10,000 transactions:**

| Component | Indonesia | US |
|-----------|-----------|-----|
| **Payment Processing** | ~$2,180 | ~$17,500 |
| **Shipping API** | ~$70 | ~$500 |
| **Database** | $25 | $25 |
| **Storage** | $5 | $5 |
| **Total** | **$2,280** | **$18,030** |

*Note: US costs justified by 10x higher average transaction value*

## Migration Strategy

### Phase 1: Parallel Run (Recommended)
```
┌─────────────────────────────────────┐
│          Frontend App               │
│                                     │
│  ┌──────────┐      ┌──────────┐   │
│  │   DOKU   │      │  Stripe  │   │
│  │  (Live)  │      │  (Test)  │   │
│  └──────────┘      └──────────┘   │
└─────────────────────────────────────┘
```

### Phase 2: Gradual Rollout
```
Traffic: 90% DOKU, 10% Stripe
         ↓
Traffic: 50% DOKU, 50% Stripe
         ↓
Traffic: 10% DOKU, 90% Stripe
         ↓
Traffic: 0% DOKU, 100% Stripe
```

### Phase 3: Full Cutover
```
┌─────────────────────────────────────┐
│          Frontend App               │
│                                     │
│             ┌──────────┐            │
│             │  Stripe  │            │
│             │  (Live)  │            │
│             └──────────┘            │
└─────────────────────────────────────┘
```

## Monitoring & Observability

### Key Metrics

```
Payment Success Rate
├── DOKU: Target 95%+
└── Stripe: Target 98%+

Webhook Delivery Rate
├── DOKU: Monitor delays
└── Stripe: 99.9%+ guaranteed

Average Payment Time
├── DOKU: ~15 seconds
└── Stripe: ~8 seconds

Failed Payment Reasons
├── Card declined
├── Insufficient funds
├── Network timeout
└── Invalid card details
```

## Disaster Recovery

### DOKU Fallback
- Manual payment reconciliation
- Customer service intervention
- Offline payment processing

### Stripe Fallback
- Automatic retry logic
- Idempotency keys
- Status sync jobs
- Payment reconciliation cron

## Conclusion

The US architecture with Stripe + EasyPost offers:
- ✅ Better user experience (embedded payments)
- ✅ Stronger security (PCI compliance)
- ✅ Higher reliability (99.99% SLA)
- ✅ Better developer experience
- ✅ More payment methods
- ⚠️ Higher transaction fees (justified by market)

Migration complexity: **Medium** (10-15 days)
Risk level: **Low** (can run parallel during testing)
