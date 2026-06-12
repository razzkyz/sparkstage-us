# Indonesia (DOKU) vs US (Stripe) - Complete Comparison

## Payment Gateway Comparison

| Feature | DOKU (Indonesia) | Stripe (US) |
|---------|------------------|-------------|
| **Payment Methods** | Virtual Account (BNI, Mandiri, BCA, BRI), Indomaret, Alfamart, QRIS | Credit/Debit Cards, ACH Bank Transfer, Apple Pay, Google Pay, Afterpay |
| **Transaction Fee** | 2.5% + Rp 2,000 | 2.9% + $0.30 (cards), 0.8% capped at $5 (ACH) |
| **Settlement Time** | 1-3 business days | 2 business days (cards), 3-5 days (ACH) |
| **Integration Method** | Jokul Checkout SDK (popup) | Stripe Elements (embedded) or Checkout Session |
| **Webhook Security** | HMAC SHA256 signature | Stripe-Signature header verification |
| **Currency** | IDR (Rupiah) | USD, EUR, GBP, 135+ currencies |
| **PCI Compliance** | Required if storing card data | Handled by Stripe (SAQ-A) |
| **Refund Process** | Manual via dashboard or API | Instant via API or dashboard |
| **Dispute Management** | Manual process | Automated with evidence submission |
| **Dashboard** | Basic transaction view | Advanced analytics, charts, reports |
| **Developer Tools** | Limited test environment | Robust test mode with test cards |
| **API Documentation** | Indonesian/English mix | Comprehensive English docs |

## Shipping Provider Comparison

| Feature | RajaOngkir (Indonesia) | EasyPost (US) |
|---------|------------------------|---------------|
| **Carriers** | JNE, TIKI, POS Indonesia, J&T, SiCepat, AnterAja | USPS, FedEx, UPS, DHL, OnTrac, LSO |
| **Coverage** | Indonesia only | US domestic + international |
| **API Integration** | REST API with API key | REST API + webhooks |
| **Pricing Model** | Subscription tiers (Starter, Basic, Pro) | Pay per label ($0.05) + carrier rates |
| **Address Validation** | Limited | Built-in USPS validation |
| **Tracking** | Via carrier websites | Unified tracking API |
| **Label Generation** | No | Yes (PNG, PDF, ZPL) |
| **Rate Shopping** | Real-time rates from multiple carriers | Real-time rates from multiple carriers |

## Technical Stack Differences

### Frontend

| Aspect | Indonesia Version | US Version |
|--------|-------------------|------------|
| **Payment SDK** | DOKU Jokul Checkout JS | @stripe/stripe-js, @stripe/react-stripe-js |
| **Payment UI** | Popup modal | Embedded form (PaymentElement) |
| **Currency Format** | Rp 50.000 | $50.00 |
| **Locale** | id-ID | en-US |
| **i18n Primary** | Indonesian (ID) | English (EN) |
| **i18n Secondary** | English (EN) | Spanish (ES) |
| **Date Format** | DD/MM/YYYY | MM/DD/YYYY |

### Backend (Edge Functions)

| Function | Indonesia (DOKU) | US (Stripe) |
|----------|------------------|-------------|
| **Create Checkout** | `create-doku-ticket-checkout` | `create-stripe-ticket-checkout` |
| **Webhook Handler** | `doku-webhook` | `stripe-webhook` |
| **Payment Sync** | `sync-doku-ticket-status` | `sync-stripe-payment-status` |
| **Product Checkout** | `create-doku-product-checkout` | `create-stripe-product-checkout` |
| **Product Sync** | `sync-doku-product-status` | `sync-stripe-product-status` |
| **Reconciliation** | `reconcile-doku-payments` | `reconcile-stripe-payments` |
| **Shipping Cost** | `rajaongkir/cost` | `calculate-shipping-cost` (EasyPost) |
| **Shipping Proxy** | `rajaongkir/province`, `rajaongkir/city` | Not needed (EasyPost validates addresses) |

### Database Schema

| Table | Indonesia Fields | US Fields (Changes) |
|-------|------------------|---------------------|
| **orders** | `doku_order_id`, `doku_invoice_number`, `doku_payment_url` | `stripe_payment_intent_id`, `stripe_customer_id`, `stripe_client_secret` |
| **order_products** | `doku_order_id`, `doku_invoice_number`, `doku_payment_url` | `stripe_payment_intent_id`, `stripe_customer_id`, `stripe_client_secret` |
| **shipping** | `rajaongkir_service`, `rajaongkir_cost`, `rajaongkir_etd` | `easypost_shipment_id`, `easypost_tracker_id`, `carrier`, `service` |

### Status Mapping

| DOKU Status | App Status | Stripe Event | Stripe Status |
|-------------|------------|--------------|---------------|
| SUCCESS | paid | payment_intent.succeeded | succeeded |
| PENDING | pending | payment_intent.processing | processing |
| FAILED | failed | payment_intent.payment_failed | requires_payment_method |
| EXPIRED | expired | payment_intent.canceled | canceled |
| REFUNDED | refunded | charge.refunded | succeeded + refunded |
| ORDER_GENERATED | pending | payment_intent.created | requires_payment_method |

## Code Migration Examples

### 1. Payment Checkout Creation

**BEFORE (DOKU):**
```typescript
// Create DOKU checkout
const response = await fetch('/functions/v1/create-doku-ticket-checkout', {
  method: 'POST',
  body: JSON.stringify({
    orderId: 'order-123',
    amount: 50000, // IDR
  })
})
const { payment_url } = await response.json()

// Open DOKU popup
window.open(payment_url, '_blank', 'width=600,height=800')
```

**AFTER (Stripe):**
```typescript
// Create Stripe Payment Intent
const response = await fetch('/functions/v1/create-stripe-ticket-checkout', {
  method: 'POST',
  body: JSON.stringify({
    orderId: 'order-123',
    amount: 50, // USD
  })
})
const { clientSecret } = await response.json()

// Render Stripe Elements
<Elements stripe={stripePromise} options={{ clientSecret }}>
  <PaymentElement />
  <button onClick={handlePayment}>Pay $50.00</button>
</Elements>
```

### 2. Webhook Signature Verification

**BEFORE (DOKU):**
```typescript
// DOKU HMAC verification
const signature = req.headers.get('signature')
const requestId = req.headers.get('request-id')
const requestTimestamp = req.headers.get('request-timestamp')

const digestValue = crypto
  .createHmac('sha256', CLIENT_ID + SECRET_KEY + requestTimestamp)
  .update(body)
  .digest('hex')

if (signature !== digestValue) {
  return new Response('Invalid signature', { status: 401 })
}
```

**AFTER (Stripe):**
```typescript
// Stripe signature verification (built-in)
const signature = req.headers.get('stripe-signature')
const body = await req.text()

const event = stripe.webhooks.constructEvent(
  body,
  signature,
  webhookSecret
)

// constructEvent will throw if verification fails
```

### 3. Currency Formatting

**BEFORE (IDR):**
```typescript
function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)
}

formatRupiah(50000) // "Rp 50.000"
```

**AFTER (USD):**
```typescript
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

formatCurrency(50) // "$50.00"
```

### 4. Shipping Cost Calculation

**BEFORE (RajaOngkir):**
```typescript
// Call RajaOngkir cost API
const response = await fetch('/functions/v1/rajaongkir/cost', {
  method: 'POST',
  body: JSON.stringify({
    origin: 'subdistrict_id',
    destination: 'subdistrict_id',
    weight: 1000, // grams
    courier: 'jne',
  })
})

const { results } = await response.json()
// results[0].costs = [{ service: 'REG', cost: [{ value: 9000 }] }]
```

**AFTER (EasyPost):**
```typescript
// Call EasyPost shipment API
const response = await fetch('/functions/v1/calculate-shipping-cost', {
  method: 'POST',
  body: JSON.stringify({
    toAddress: {
      street1: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
    },
    weight: 1, // pounds
  })
})

const { rates } = await response.json()
// rates = [{ carrier: 'USPS', service: 'Priority', rate: '8.50' }]
```

### 5. Payment Status Update

**BEFORE (DOKU Webhook):**
```typescript
// DOKU webhook payload
{
  "order": {
    "invoice_number": "INV-001",
    "amount": 50000
  },
  "transaction": {
    "status": "SUCCESS" // or PENDING, FAILED, EXPIRED
  }
}

// Map to app status
const statusMap = {
  SUCCESS: 'paid',
  PENDING: 'pending',
  FAILED: 'failed',
  EXPIRED: 'expired',
}
```

**AFTER (Stripe Webhook):**
```typescript
// Stripe webhook event
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xxx",
      "amount": 5000, // cents
      "status": "succeeded"
    }
  }
}

// Direct event type handling
switch (event.type) {
  case 'payment_intent.succeeded':
    status = 'paid'
    break
  case 'payment_intent.payment_failed':
    status = 'failed'
    break
}
```

## Environment Setup Comparison

### Indonesia (DOKU) Setup

```bash
# Frontend
VITE_DOKU_IS_PRODUCTION=false
VITE_SUPABASE_URL=...
VITE_APP_URL=...

# Backend (Supabase Secrets)
DOKU_CLIENT_ID=...
DOKU_SECRET_KEY=...
DOKU_IS_PRODUCTION=false
DOKU_PAYMENT_METHOD_TYPES=VIRTUAL_ACCOUNT_BNI,QRIS,ONLINE_TO_OFFLINE_INDOMARET
RAJAONGKIR_API_KEY=...
```

### US (Stripe) Setup

```bash
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_SUPABASE_URL=...
VITE_APP_URL=...
VITE_CURRENCY=USD
VITE_LOCALE=en-US

# Backend (Supabase Secrets)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
EASYPOST_API_KEY=EZAK...
```

## Testing Comparison

### Payment Testing

| Aspect | DOKU (Indonesia) | Stripe (US) |
|--------|------------------|-------------|
| **Test Environment** | Sandbox (sandbox.doku.com) | Test Mode (built-in) |
| **Test Cards** | Not available (use demo accounts) | 20+ test cards with different scenarios |
| **Webhook Testing** | Manual trigger via dashboard | Stripe CLI (`stripe trigger`) |
| **Test Amount** | Any amount in IDR | Any amount in USD (cents) |

**Stripe Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient Funds: 4000 0000 0000 9995
Authentication Required: 4000 0025 0000 3155
```

### Shipping Testing

| Aspect | RajaOngkir | EasyPost |
|--------|------------|----------|
| **Test API** | Same as production (limited free tier) | Full test mode with test API key |
| **Test Addresses** | Real Indonesian addresses | Test addresses provided by EasyPost |

## Migration Effort Estimation

| Task | Estimated Time | Difficulty |
|------|----------------|------------|
| **Setup Stripe account** | 1 hour | Easy |
| **Setup EasyPost account** | 30 minutes | Easy |
| **Database migration** | 2-3 hours | Medium |
| **Backend functions (Stripe)** | 1-2 days | Medium |
| **Backend functions (Shipping)** | 1 day | Medium |
| **Frontend payment UI** | 1-2 days | Medium |
| **Frontend shipping UI** | 1 day | Easy |
| **i18n translation** | 1-2 days | Easy |
| **Currency conversion** | 1 day | Easy |
| **Testing** | 2-3 days | Medium |
| **Deployment** | 1 day | Easy |
| **Total** | **10-15 days** | **Medium** |

## Cost Comparison (Monthly Estimate for 1000 transactions)

### Indonesia (DOKU + RajaOngkir)

| Item | Cost |
|------|------|
| **Payment Processing** | 1000 × (2.5% of Rp 50,000 + Rp 2,000) = Rp 3,250,000 (~$218) |
| **RajaOngkir API** | Rp 100,000 - Rp 500,000/month (~$7-34) |
| **Supabase** | $25/month |
| **Cloudflare R2** | ~$5/month |
| **Total** | **~$255-282/month** |

### US (Stripe + EasyPost)

| Item | Cost |
|------|------|
| **Payment Processing** | 1000 × (2.9% of $50 + $0.30) = $1,750 |
| **Shipping Labels** | 1000 × $0.05 = $50 |
| **Supabase** | $25/month |
| **Cloudflare R2** | ~$5/month |
| **Total** | **~$1,830/month** |

**Note:** US costs appear higher but:
- Average transaction value is higher in USD
- US market has higher profit margins
- Stripe provides better fraud protection (reduces chargebacks)

## Feature Parity Checklist

| Feature | Indonesia (DOKU) | US (Stripe) | Status |
|---------|------------------|-------------|--------|
| **Ticket Purchase** | ✅ | ✅ Ready | Port to Stripe |
| **Product Purchase** | ✅ | ✅ Ready | Port to Stripe |
| **Cashier Orders** | ✅ | ✅ Keep same | No change needed |
| **QR Code Scanning** | ✅ | ✅ Keep same | No change needed |
| **Pickup System** | ✅ | ✅ Keep same | No change needed |
| **Stock Management** | ✅ | ✅ Keep same | No change needed |
| **Voucher System** | ✅ | ✅ Keep same | No change needed |
| **Admin Dashboard** | ✅ | ✅ Keep same | No change needed |
| **WhatsApp Invoices** | ✅ | ✅ Keep same | Update templates to English |
| **Shipping Calculator** | ✅ RajaOngkir | ✅ EasyPost | Replace API |
| **Payment Methods** | VA, QRIS, OTC | Cards, ACH | Different methods |
| **Refunds** | Manual | Automatic | Improved |

## Deployment Checklist

### Pre-Deployment
- [ ] Stripe account verified
- [ ] EasyPost account verified
- [ ] All test payments successful
- [ ] Webhook signature verification working
- [ ] Database migration tested
- [ ] Frontend UI reviewed
- [ ] i18n translations complete
- [ ] Currency formatting correct

### Deployment
- [ ] Update frontend environment variables
- [ ] Update backend Supabase secrets
- [ ] Deploy database migrations
- [ ] Deploy Supabase functions
- [ ] Deploy frontend to Vercel
- [ ] Update Stripe webhook URL
- [ ] Switch to live API keys

### Post-Deployment
- [ ] Test live payment (small amount)
- [ ] Monitor webhook logs
- [ ] Monitor payment success rate
- [ ] Monitor error logs
- [ ] Set up alerting (failed payments)
- [ ] Document any issues

## Resources

### Documentation
- [DOKU API Docs](https://jokul.doku.com/docs)
- [Stripe API Docs](https://stripe.com/docs/api)
- [RajaOngkir Docs](https://rajaongkir.com/dokumentasi)
- [EasyPost Docs](https://www.easypost.com/docs/api)

### Support
- DOKU Support: support@doku.com
- Stripe Support: https://support.stripe.com
- RajaOngkir Support: support@rajaongkir.com
- EasyPost Support: support@easypost.com
