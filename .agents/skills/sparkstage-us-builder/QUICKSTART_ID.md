# SparkStage US - Panduan Cepat

## 🎯 Tujuan

Membuat versi SparkStage untuk pasar Amerika dengan:
- ✅ Payment gateway US (Stripe/PayPal/Square) menggantikan DOKU
- ✅ Shipping US (USPS/FedEx/UPS) menggantikan RajaOngkir
- ✅ Currency USD menggantikan IDR
- ✅ Bahasa Inggris menggantikan Bahasa Indonesia
- ✅ 100% struktur dan fitur sama dengan SparkStage Indonesia

## 📋 Yang Perlu Disiapkan

### 1. Akun Payment Gateway (Pilih Salah Satu)

**REKOMENDASI: Stripe** (paling populer di US)
- Daftar di: https://stripe.com
- Dapatkan API keys (test mode dulu)
- Setup webhook endpoint
- **Biaya:** 2.9% + $0.30 per transaksi

**Alternatif: PayPal**
- Daftar di: https://developer.paypal.com
- **Biaya:** 3.49% + $0.49 per transaksi

**Alternatif: Square**
- Daftar di: https://squareup.com
- Bagus untuk POS + online unified
- **Biaya:** 2.9% + $0.30 (online)

### 2. Akun Shipping Provider (Pilih Salah Satu)

**REKOMENDASI: EasyPost** (multi-carrier, paling gampang)
- Daftar di: https://www.easypost.com
- Dapat USPS, FedEx, UPS, DHL dalam 1 API
- **Biaya:** $0.05 per label + ongkir carrier

**Alternatif: ShipEngine**
- Daftar di: https://www.shipengine.com
- Similar dengan EasyPost

**Alternatif: USPS Direct (gratis tapi ribet)**
- Daftar di: https://www.usps.com/business/web-tools-apis/

### 3. Tech Stack (Sama seperti aslinya)
- Node.js 18+ (sudah ada)
- Supabase account (sudah ada)
- Cloudflare account untuk R2 (sudah ada)
- Vercel/Netlify untuk deploy frontend

## 🚀 Langkah-Langkah Migrasi

### Step 1: Clone & Setup Project Baru

```bash
# Clone project asli atau buat folder baru
mkdir sparkstage-us
cd sparkstage-us

# Copy semua file dari sparkstage Indonesia
cp -r ../sparkstage/* .

# Install dependencies
cd frontend
npm install
```

### Step 2: Install Dependencies Baru

```bash
# Frontend - Stripe SDK
npm install @stripe/stripe-js@^2.4.0
npm install @stripe/react-stripe-js@^2.4.0

# Hapus DOKU (kalau ada)
npm uninstall @doku/jokul-checkout-js
```

### Step 3: Setup Stripe Account

1. **Buat account Stripe:**
   - Kunjungi https://stripe.com
   - Signup dengan email business
   - Verifikasi email

2. **Dapatkan API Keys (Test Mode dulu):**
   - Buka Dashboard > Developers > API keys
   - Copy **Publishable key** (pk_test_...)
   - Copy **Secret key** (sk_test_...)
   - JANGAN share secret key ke siapa-siapa!

3. **Setup Webhook:**
   - Buka Dashboard > Developers > Webhooks
   - Klik "Add endpoint"
   - URL: `https://[PROJECT_ID].supabase.co/functions/v1/stripe-webhook`
   - Select events:
     - ✅ payment_intent.succeeded
     - ✅ payment_intent.payment_failed
     - ✅ payment_intent.canceled
     - ✅ charge.refunded
   - Copy **Signing secret** (whsec_...)

### Step 4: Setup Environment Variables

**Frontend (.env.local):**
```bash
# Copy dari .env.example
cp .env.example .env.local

# Edit .env.local
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_APP_URL=https://your-us-app.com
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
VITE_CURRENCY=USD
VITE_LOCALE=en-US
```

**Backend (Supabase Secrets):**
```bash
# Set secrets di Supabase
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set PUBLIC_APP_URL=https://your-us-app.com
supabase secrets set APP_ALLOWED_ORIGINS=https://your-us-app.com
```

### Step 5: Update Database Schema

```bash
# Buat migration baru
supabase migration new add_stripe_payment_fields

# Edit file migration yang baru dibuat
# Tambahkan kolom-kolom Stripe
```

**Migration SQL:**
```sql
-- supabase/migrations/XXXXXX_add_stripe_payment_fields.sql

-- Add Stripe fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_client_secret TEXT;

-- Add Stripe fields to order_products table
ALTER TABLE order_products
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_client_secret TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent 
ON orders(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_order_products_stripe_payment_intent 
ON order_products(stripe_payment_intent_id);

-- Update RLS policies (jika perlu)
```

**Push migration:**
```bash
npm run supabase:db:push
```

### Step 6: Buat Edge Functions (Stripe)

**6.1 Create Stripe Ticket Checkout Function:**

```bash
supabase functions new create-stripe-ticket-checkout
```

Edit `supabase/functions/create-stripe-ticket-checkout/index.ts`:

```typescript
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { orderId, amount, customerEmail, customerName } = await req.json()

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount')
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert dollars to cents
      currency: 'usd',
      metadata: {
        order_id: orderId,
        type: 'ticket',
      },
      receipt_email: customerEmail,
      description: `Ticket order ${orderId}`,
    })

    // Update order in database
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        stripe_client_secret: paymentIntent.client_secret,
        status: 'pending',
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Database update error:', updateError)
      throw updateError
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
```

**6.2 Create Stripe Webhook Function:**

```bash
supabase functions new stripe-webhook
```

Edit `supabase/functions/stripe-webhook/index.ts`:

```typescript
import Stripe from 'https://esm.sh/stripe@14.14.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Handle different event types
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      
      // Update order status to paid
      if (paymentIntent.metadata.type === 'ticket') {
        await supabaseClient
          .from('orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        
        // TODO: Generate tickets (call existing ticket generation logic)
      } else if (paymentIntent.metadata.type === 'product') {
        await supabaseClient
          .from('order_products')
          .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        
        // TODO: Generate pickup code
      }
      break
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      
      if (paymentIntent.metadata.type === 'ticket') {
        await supabaseClient
          .from('orders')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
      } else if (paymentIntent.metadata.type === 'product') {
        await supabaseClient
          .from('order_products')
          .update({ payment_status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
        
        // TODO: Release stock and voucher
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const paymentIntentId = charge.payment_intent as string
      
      // Update refund status
      await supabaseClient
        .from('orders')
        .update({ status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId)
      
      await supabaseClient
        .from('order_products')
        .update({ payment_status: 'refunded' })
        .eq('stripe_payment_intent_id', paymentIntentId)
      break
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**6.3 Deploy Functions:**

```bash
supabase functions deploy create-stripe-ticket-checkout
supabase functions deploy stripe-webhook
```

### Step 7: Update Frontend Payment Page

Edit `frontend/src/pages/PaymentPage.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '../lib/supabase'

// Load Stripe outside component
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function CheckoutForm({ orderId, amount }: { orderId: string; amount: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)
    setError(null)

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/booking-success/${orderId}`,
      },
    })

    if (submitError) {
      setError(submitError.message ?? 'Payment failed')
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
        <div className="mb-4">
          <p className="text-gray-600">Total Amount:</p>
          <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
        </div>
        <PaymentElement />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  )
}

export function PaymentPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [clientSecret, setClientSecret] = useState<string>('')
  const [amount, setAmount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initPayment = async () => {
      try {
        // Fetch order details
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (orderError) throw orderError
        if (!order) throw new Error('Order not found')

        setAmount(order.total_amount)

        // Create Stripe Payment Intent
        const { data: session } = await supabase.auth.getSession()
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-ticket-checkout`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              orderId: order.id,
              amount: order.total_amount,
              customerEmail: order.customer_email,
              customerName: order.customer_name,
            }),
          }
        )

        const result = await response.json()
        
        if (result.error) throw new Error(result.error)

        setClientSecret(result.clientSecret)
      } catch (err: any) {
        console.error('Error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (orderId) {
      initPayment()
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h2 className="font-semibold mb-2">Payment Error</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!clientSecret) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Complete Your Payment</h1>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'stripe',
            },
          }}
        >
          <CheckoutForm orderId={orderId!} amount={amount} />
        </Elements>
      </div>
    </div>
  )
}
```

### Step 8: Test Payment Flow

**Test dengan Stripe Test Cards:**

```
Success Card:
Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits

Decline Card:
Number: 4000 0000 0000 0002

Insufficient Funds:
Number: 4000 0000 0000 9995
```

**Test Webhook Locally:**

```bash
# Install Stripe CLI
# Windows: https://github.com/stripe/stripe-cli/releases/latest

# Login
stripe login

# Forward webhooks to local
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Trigger test event
stripe trigger payment_intent.succeeded
```

### Step 9: Update Bahasa & Currency

**9.1 Update i18n files:**

```bash
# Edit frontend/src/locales/en.json
# Ganti semua text dari Indonesian ke English
```

**9.2 Update currency formatter:**

```typescript
// frontend/src/utils/currency.ts

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// Ganti semua formatRupiah() menjadi formatCurrency()
```

### Step 10: Deploy ke Production

**10.1 Deploy Frontend (Vercel):**

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel deploy --prod
```

**10.2 Deploy Supabase Functions:**

```bash
# Switch ke Stripe Live keys
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Deploy functions
supabase functions deploy
```

**10.3 Update Stripe Webhook URL:**
- Buka Stripe Dashboard > Webhooks
- Update endpoint URL ke production:
  `https://[PROJECT_ID].supabase.co/functions/v1/stripe-webhook`

## ✅ Checklist Final

- [ ] Stripe account created & verified
- [ ] Test payment berhasil
- [ ] Webhook berfungsi
- [ ] Database migration completed
- [ ] Frontend deployed
- [ ] Backend functions deployed
- [ ] Semua environment variables set
- [ ] i18n updated ke English
- [ ] Currency changed ke USD
- [ ] Test end-to-end di production

## 📞 Butuh Bantuan?

Untuk pertanyaan spesifik, gunakan agent dengan command:

```
"Help me migrate DOKU to Stripe"
"Create Stripe webhook handler"
"Update payment page with Stripe Elements"
"Add shipping cost calculation"
```

## 📚 Resources

- [Stripe Docs](https://stripe.com/docs)
- [Stripe React Docs](https://stripe.com/docs/stripe-js/react)
- [Supabase Functions](https://supabase.com/docs/guides/functions)
- [EasyPost Docs](https://www.easypost.com/docs/api)

## 💡 Tips

1. **Mulai dengan Test Mode** - Jangan langsung ke production
2. **Test Webhook Thoroughly** - Ini yang paling sering error
3. **Monitor Payment Closely** - First 24 jam penting banget
4. **Keep DOKU Backup** - Jaga kode DOKU sampai 100% yakin Stripe stable
5. **Use EasyPost for Shipping** - Paling gampang daripada integrate USPS/FedEx sendiri
