# SparkStage US Builder Skill

## Purpose
Expert agent for building a US market version of SparkStage booking & e-commerce platform with US payment gateways (Stripe, PayPal, Square) replacing DOKU payments.

## Keywords
sparkstage, us-market, stripe, paypal, square, payment-gateway, e-commerce, booking, ticketing, supabase, react, vite, typescript

## When to Use
- Building a US market version of SparkStage platform
- Replacing DOKU payment gateway with US payment providers
- Adapting Indonesian e-commerce patterns to US market
- Setting up Stripe, PayPal, or Square integration
- Migrating payment flows from DOKU to US gateways
- Configuring US shipping providers (USPS, FedEx, UPS)
- Adapting currency from IDR to USD
- US market compliance and tax calculations

## Tech Stack Overview

### Frontend
- **Framework:** Vite 6 + React 18 + TypeScript
- **Styling:** Tailwind CSS 4
- **Routing:** React Router DOM 7
- **State Management:** TanStack Query 5
- **Auth:** Supabase Auth
- **i18n:** i18next (English primary, Spanish secondary)

### Backend
- **Database:** Supabase Postgres
- **Functions:** Supabase Edge Functions (Deno)
- **Storage:** Cloudflare R2 (image CDN)
- **RLS:** Row Level Security policies
- **Cron:** pg_cron for scheduled jobs

### Payment Gateways (US Market)
- **Primary Option:** Stripe (recommended)
  - Best for: Credit cards, ACH, Apple Pay, Google Pay
  - Webhooks: Reliable event system
  - PCI Compliance: Built-in
  
- **Alternative Option:** PayPal
  - Best for: PayPal accounts, Venmo
  - Webhooks: IPN and REST webhooks
  
- **POS Option:** Square
  - Best for: In-person + online unified POS
  - Webhooks: Real-time payment events

### Shipping Providers (US Market)
- **USPS:** USPS API or EasyPost
- **FedEx:** FedEx Web Services API
- **UPS:** UPS API or Shippo
- **Multi-carrier:** ShipEngine or EasyPost (aggregator)

## Project Structure

```
sparkstage-us/
├── frontend/                    # React SPA
│   ├── src/
│   │   ├── pages/              # Route pages
│   │   │   ├── PaymentPage.tsx            # Stripe Checkout integration
│   │   │   ├── BookingSuccessPage.tsx
│   │   │   ├── ProductCheckoutPage.tsx
│   │   │   └── admin/                     # Admin CMS
│   │   ├── components/         # Reusable UI
│   │   ├── hooks/              # Custom hooks (TanStack Query)
│   │   ├── lib/                # Supabase client, helpers
│   │   ├── contexts/           # React contexts
│   │   └── utils/              # Utilities
│   └── package.json
├── supabase/
│   ├── migrations/             # Database schema & RLS
│   ├── functions/              # Edge Functions
│   │   ├── create-stripe-ticket-checkout/
│   │   ├── create-stripe-product-checkout/
│   │   ├── stripe-webhook/
│   │   ├── sync-stripe-payment-status/
│   │   ├── calculate-shipping-cost/      # USPS/FedEx/UPS
│   │   └── _shared/
│   │       ├── payment-effects.ts        # Shared payment logic
│   │       ├── stripe-client.ts
│   │       └── shipping-providers.ts
│   └── config.toml
├── docs/
│   ├── architecture.md
│   ├── runbooks/
│   │   ├── stripe-payments.md
│   │   ├── shipping-integration.md
│   │   └── us-market-setup.md
│   └── decisions/
└── AGENTS.md                   # Repo memory
```

## Payment Flow Architecture

### Original (DOKU - Indonesia)
```
Frontend → create-doku-checkout → DOKU API
         ← payment_url
Frontend → DOKU Jokul SDK popup
DOKU → doku-webhook → Update DB
Frontend → sync-doku-status (fallback)
Cron → reconcile-doku-payments (repair)
```

### New (Stripe - US)
```
Frontend → create-stripe-checkout → Stripe API
         ← client_secret
Frontend → Stripe Elements (embedded)
Stripe → stripe-webhook → Update DB
Frontend → sync-stripe-payment-status (fallback)
Cron → reconcile-stripe-payments (repair)
```

## Key Differences: DOKU vs Stripe

| Aspect | DOKU (ID) | Stripe (US) |
|--------|-----------|-------------|
| **Integration** | Jokul Checkout popup | Stripe Elements embedded |
| **Payment Methods** | VA, Indomaret, Alfamart, QRIS | Cards, ACH, Apple Pay, Google Pay |
| **Webhook Security** | HMAC signature | Stripe signature verification |
| **Currency** | IDR (Rupiah) | USD (Dollar) |
| **Checkout Flow** | Redirect popup | Embedded form |
| **Status Mapping** | Custom DOKU states | Stripe event types |

## Migration Checklist

### Phase 1: Environment Setup
- [ ] Create Stripe account (test mode first)
- [ ] Get Stripe API keys (publishable + secret)
- [ ] Set up Stripe webhook endpoint
- [ ] Configure Supabase secrets
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PUBLISHABLE_KEY` (frontend env)
- [ ] Update currency from IDR to USD
- [ ] Configure US tax calculation (optional: Stripe Tax)

### Phase 2: Database Migration
- [ ] Clone original migrations
- [ ] Update payment-related tables
  - Change `doku_*` columns to `stripe_*`
  - Add `stripe_payment_intent_id`
  - Add `stripe_customer_id`
- [ ] Update RLS policies for new columns
- [ ] Create US-specific voucher rules (if needed)

### Phase 3: Backend Functions
- [ ] Replace `create-doku-ticket-checkout` → `create-stripe-ticket-checkout`
- [ ] Replace `create-doku-product-checkout` → `create-stripe-product-checkout`
- [ ] Replace `doku-webhook` → `stripe-webhook`
- [ ] Replace `sync-doku-ticket-status` → `sync-stripe-payment-status`
- [ ] Replace `sync-doku-product-status` → `sync-stripe-product-status`
- [ ] Replace `reconcile-doku-payments` → `reconcile-stripe-payments`
- [ ] Update `_shared/payment-effects.ts`
- [ ] Create `_shared/stripe-client.ts`

### Phase 4: Frontend Changes
- [ ] Install `@stripe/stripe-js` and `@stripe/react-stripe-js`
- [ ] Replace DOKU Jokul SDK with Stripe Elements
- [ ] Update `PaymentPage.tsx` with Stripe integration
- [ ] Update `ProductCheckoutPage.tsx`
- [ ] Update success/pending pages
- [ ] Update i18n from Indonesian to English
- [ ] Change currency display IDR → USD

### Phase 5: Shipping Integration
- [ ] Choose shipping provider (USPS/FedEx/UPS/EasyPost)
- [ ] Create `calculate-shipping-cost` function
- [ ] Update product checkout with shipping selector
- [ ] Add shipping address validation
- [ ] Create shipping label generation (optional)

### Phase 6: Testing & Deployment
- [ ] Test Stripe test mode end-to-end
- [ ] Test webhook signature verification
- [ ] Test payment success/failure flows
- [ ] Test refund flow
- [ ] Smoke test in Stripe production mode
- [ ] Monitor first 24-48 hours

## Code Examples

### Stripe Checkout Creation (Edge Function)

```typescript
// supabase/functions/create-stripe-ticket-checkout/index.ts
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { bookingId, amount, customerEmail } = await req.json()

  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      booking_id: bookingId,
      type: 'ticket',
    },
    receipt_email: customerEmail,
  })

  // Store payment intent in database
  await supabase
    .from('orders')
    .update({
      stripe_payment_intent_id: paymentIntent.id,
      stripe_client_secret: paymentIntent.client_secret,
    })
    .eq('id', bookingId)

  return new Response(
    JSON.stringify({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Stripe Webhook Handler

```typescript
// supabase/functions/stripe-webhook/index.ts
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { applyPaymentEffects } from '../_shared/payment-effects.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle payment success
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    
    await applyPaymentEffects({
      paymentIntentId: paymentIntent.id,
      status: 'paid',
      type: paymentIntent.metadata.type, // 'ticket' or 'product'
    })
  }

  // Handle payment failure
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    
    await applyPaymentEffects({
      paymentIntentId: paymentIntent.id,
      status: 'failed',
      type: paymentIntent.metadata.type,
    })
  }

  return new Response(JSON.stringify({ received: true }))
})
```

### Frontend Stripe Integration

```typescript
// frontend/src/pages/PaymentPage.tsx
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm({ clientSecret }: { clientSecret: string }) {
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) return

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-success`,
      },
    })

    if (error) {
      console.error(error.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe}>
        Pay Now
      </button>
    </form>
  )
}

export function PaymentPage() {
  const [clientSecret, setClientSecret] = useState('')

  // Fetch clientSecret from your Edge Function
  useEffect(() => {
    fetch('/functions/v1/create-stripe-ticket-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: '...' }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret))
  }, [])

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} />
    </Elements>
  )
}
```

## Shipping Integration Pattern

```typescript
// supabase/functions/calculate-shipping-cost/index.ts
import { EasyPostClient } from 'npm:@easypost/api@7.0.0'

const easypost = new EasyPostClient(Deno.env.get('EASYPOST_API_KEY')!)

Deno.serve(async (req) => {
  const { toAddress, weight, dimensions } = await req.json()

  const shipment = await easypost.Shipment.create({
    to_address: toAddress,
    from_address: {
      street1: '123 Warehouse St',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
      country: 'US',
    },
    parcel: {
      weight,
      ...dimensions,
    },
  })

  // Return rates from USPS, FedEx, UPS
  return new Response(
    JSON.stringify({
      rates: shipment.rates.map((rate) => ({
        carrier: rate.carrier,
        service: rate.service,
        rate: rate.rate,
        deliveryDays: rate.delivery_days,
      })),
    })
  )
})
```

## Environment Variables

### Frontend (.env)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://your-app.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_CURRENCY=USD
VITE_LOCALE=en-US
```

### Backend (Supabase Secrets)
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set EASYPOST_API_KEY=EZAK...
supabase secrets set PUBLIC_APP_URL=https://your-app.com
supabase secrets set APP_ALLOWED_ORIGINS=https://your-app.com
```

## Status Mapping

### Stripe Event → App Status
- `payment_intent.succeeded` → `paid`
- `payment_intent.processing` → `pending`
- `payment_intent.payment_failed` → `failed`
- `payment_intent.canceled` → `cancelled`
- `charge.refunded` → `refunded`

### DOKU Status → Stripe Equivalent
- `SUCCESS` → `payment_intent.succeeded`
- `PENDING` → `payment_intent.processing`
- `FAILED` → `payment_intent.payment_failed`
- `EXPIRED` → `payment_intent.canceled`
- `REFUNDED` → `charge.refunded`

## Testing Strategy

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

### Test Webhook Locally
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

## Deployment Commands

```bash
# Frontend
npm run build
vercel deploy --prod

# Backend migrations
npm run supabase:db:push

# Deploy edge functions
supabase functions deploy create-stripe-ticket-checkout
supabase functions deploy stripe-webhook
supabase functions deploy calculate-shipping-cost

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

## Monitoring & Observability

### Key Metrics to Track
- Payment success rate (target: >95%)
- Webhook delivery rate (target: >99%)
- Payment processing time (target: <3s)
- Refund processing time (target: <24h)

### Stripe Dashboard Alerts
- Failed payment spike
- Webhook endpoint down
- High dispute rate

### Database Audit Queries
```sql
-- Stuck pending payments
SELECT order_number, status, created_at
FROM orders
WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour';

-- Missing payment intents
SELECT order_number
FROM orders
WHERE status = 'paid' AND stripe_payment_intent_id IS NULL;
```

## Security Checklist

- [ ] Stripe webhook signature verification enabled
- [ ] API keys stored in Supabase secrets (never in code)
- [ ] CORS configured with `APP_ALLOWED_ORIGINS`
- [ ] RLS policies protect payment data
- [ ] PCI compliance via Stripe (no card data stored)
- [ ] HTTPS enforced on all endpoints
- [ ] Rate limiting on payment endpoints

## Cost Estimation

### Payment Processing (Stripe)
- **Cards:** 2.9% + $0.30 per transaction
- **ACH:** 0.8% (capped at $5)
- **International cards:** +1.5%

### Shipping (EasyPost)
- **Commercial pricing:** USPS/UPS/FedEx negotiated rates
- **API fee:** $0.05 per label

### Infrastructure (Supabase + Cloudflare)
- **Supabase Pro:** $25/month (includes 8GB database)
- **Cloudflare R2:** $0.015/GB storage + free egress

## Common Pitfalls

1. **Not verifying webhook signatures** → Opens security hole
2. **Storing amount in dollars instead of cents** → Rounding errors
3. **Not handling idempotency** → Duplicate charges
4. **Missing payment intent metadata** → Can't link to orders
5. **Not testing refund flow** → Customer service nightmare

## Resources

- [Stripe Docs](https://stripe.com/docs)
- [Stripe Elements React](https://stripe.com/docs/stripe-js/react)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [EasyPost Shipping API](https://www.easypost.com/docs/api)
- [USPS API](https://www.usps.com/business/web-tools-apis/)

## Agent Behavior

When activated, this skill will:
1. Analyze current DOKU implementation
2. Propose Stripe/PayPal/Square architecture
3. Generate migration plan with phases
4. Write Edge Functions for US payment gateway
5. Update frontend components with Stripe Elements
6. Configure shipping provider integration
7. Update database migrations
8. Generate testing checklist
9. Provide deployment runbook

Always prioritize:
- Security (webhook verification, PCI compliance)
- Idempotency (prevent duplicate charges)
- Reliability (webhook + fallback sync + cron reconciliation)
- Observability (logging, metrics, alerts)
