# SparkStage US - Deployment Guide

## Pre-Deployment Checklist

### Accounts Setup
- [ ] Stripe account created and verified
- [ ] Business information completed in Stripe Dashboard
- [ ] Bank account connected for payouts
- [ ] EasyPost account created (for shipping)
- [ ] Supabase project created
- [ ] Vercel account ready (for frontend hosting)
- [ ] Cloudflare R2 bucket created (for images)

### API Keys Ready
- [ ] Stripe Publishable Key (pk_test_... or pk_live_...)
- [ ] Stripe Secret Key (sk_test_... or sk_live_...)
- [ ] Stripe Webhook Secret (whsec_...)
- [ ] EasyPost API Key (EZAK...)
- [ ] Supabase URL
- [ ] Supabase Anon Key
- [ ] Supabase Service Role Key

## Step-by-Step Deployment

### 1. Database Setup (15 minutes)

```bash
# Navigate to project root
cd sparkstage-us

# Create new migration for Stripe fields
supabase migration new add_stripe_payment_fields

# Push migrations to Supabase
npm run supabase:db:push

# Verify migration success
supabase migration list
```

**Migration SQL Template:**
```sql
-- Add Stripe payment fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_client_secret TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent 
ON orders(stripe_payment_intent_id);
```

### 2. Configure Supabase Secrets (10 minutes)

```bash
# Set Stripe secrets (TEST MODE first!)
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Set shipping secrets
supabase secrets set EASYPOST_API_KEY=EZAK...

# Set app configuration
supabase secrets set PUBLIC_APP_URL=https://your-app.vercel.app
supabase secrets set APP_ALLOWED_ORIGINS=https://your-app.vercel.app

# Verify secrets are set
supabase secrets list
```

### 3. Deploy Edge Functions (20 minutes)

```bash
# Deploy Stripe payment functions
supabase functions deploy create-stripe-ticket-checkout
supabase functions deploy create-stripe-product-checkout
supabase functions deploy stripe-webhook
supabase functions deploy sync-stripe-payment-status

# Deploy shipping function
supabase functions deploy calculate-shipping-cost

# Verify deployment
supabase functions list
```

**Expected Output:**
```
NAME                              VERSION  STATUS
create-stripe-ticket-checkout     1        ACTIVE
create-stripe-product-checkout    1        ACTIVE
stripe-webhook                    1        ACTIVE
sync-stripe-payment-status        1        ACTIVE
calculate-shipping-cost           1        ACTIVE
```

### 4. Configure Stripe Webhook (5 minutes)

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter webhook URL:
   ```
   https://[PROJECT_ID].supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
