# 📊 US Migration Analysis - Database & Code Changes

**Generated:** 2026-06-13  
**Status:** ✅ Analysis Complete  
**Project:** SparkStage US (Stripe Integration)

---

## 🎯 Executive Summary

Good news! The SparkStage database schema is **already generic** and does NOT require migration changes for US Stripe integration. The schema uses generic column names (`payment_gateway`, `payment_id`, `payment_url`) instead of hardcoded DOKU-specific columns.

---

## 📊 Database Schema Analysis

### ✅ Current Schema (Generic Payment Columns)

#### **`orders` Table:**
```sql
- payment_gateway (text) -- "DOKU" | "Stripe" | "PayPal"
- payment_id (text) -- Transaction ID from gateway
- payment_url (text) -- Payment checkout URL
- payment_data (jsonb) -- Full payment response metadata
- paymenku_trx_id (text) -- Legacy Paymenku reference (can be reused or ignored)
```

#### **`order_products` Table:**
```sql
- payment_gateway (text) -- "DOKU" | "Stripe" | "PayPal"
- payment_status (text) -- "pending" | "paid" | "failed" | "expired"
- payment_url (text) -- Checkout URL
- payment_data (jsonb) -- Full payment response metadata
- paymenku_trx_id (text) -- Legacy reference
- paid_at (timestamp)
- payment_expired_at (timestamp)
```

### ❌ NO Migration Needed!

The schema **does NOT** contain DOKU-specific columns like:
- ❌ `doku_order_id`
- ❌ `doku_invoice_number`
- ❌ `doku_customer_id`

All payment columns are **generic** and can work with any payment gateway.

---

## 🔄 What Needs To Change?

### 1️⃣ **Supabase Edge Functions** (Backend)

| **Action** | **File/Function** | **Change** |
|------------|-------------------|------------|
| ❌ **DELETE** | `create-doku-ticket-checkout` | DOKU-specific ticket checkout |
| ❌ **DELETE** | `create-doku-product-checkout` | DOKU-specific product checkout |
| ❌ **DELETE** | `doku-webhook` | DOKU webhook handler |
| ❌ **DELETE** | `sync-doku-ticket-status` | DOKU status sync |
| ❌ **DELETE** | `sync-doku-product-status` | DOKU status sync |
| ❌ **DELETE** | `reconcile-doku-payments` | DOKU reconciliation |
| ❌ **DELETE** | `rajaongkir/` (folder) | Indonesia shipping (RajaOngkir) |
| ✅ **CREATE** | `create-stripe-ticket-checkout` | Stripe ticket checkout |
| ✅ **CREATE** | `create-stripe-product-checkout` | Stripe product checkout |
| ✅ **CREATE** | `stripe-webhook` | Stripe webhook handler |
| ✅ **CREATE** | `sync-stripe-payment-status` | Stripe status sync |
| ✅ **CREATE** | `calculate-shipping-cost` | US shipping (EasyPost) |

### 2️⃣ **Frontend Code** (React + TypeScript)

| **File** | **Change** | **Status** |
|----------|-----------|------------|
| `PaymentPage.tsx` | Replace DOKU Jokul SDK → Stripe Elements | 🔧 TODO |
| `ProductCheckoutPage.tsx` | Update checkout flow for Stripe | 🔧 TODO |
| `utils/currency.ts` | Replace `formatRupiah()` → `formatCurrency()` (USD) | 🔧 TODO |
| `utils/payment.ts` | Update payment gateway logic | 🔧 TODO |

### 3️⃣ **Database Migrations** (Optional Enhancements)

| **Migration** | **Description** | **Priority** |
|---------------|-----------------|--------------|
| Add Stripe metadata columns | `stripe_payment_intent_id`, `stripe_customer_id`, `stripe_client_secret` | 🟢 Optional (can use `payment_data` JSON) |
| Add US shipping fields | `shipping_address`, `shipping_provider`, `tracking_number` | ✅ **DONE** (20260610000000_add_shipping_fields_to_order_products.sql) |
| Update payment status enum | Add `refunded`, `partially_refunded` | 🟡 Nice-to-have |

### 4️⃣ **Cron Jobs**

| **Cron Job** | **Action** |
|--------------|-----------|
| `reconcile-doku-payments-every-5-minutes` | ❌ DELETE or rename to `reconcile-stripe-payments-every-5-minutes` |

---

## 🗂️ Database Strategy

### Option A: **Keep Generic Schema** (Recommended ✅)

**Pros:**
- No migration needed
- Works with any payment gateway (Stripe, PayPal, Square)
- `payment_data` JSONB column stores gateway-specific metadata
- Easier to maintain

**Implementation:**
```typescript
// When creating Stripe order
await supabase.from('orders').insert({
  payment_gateway: 'Stripe',
  payment_id: paymentIntent.id, // "pi_xxxx"
  payment_url: clientSecret,
  payment_data: {
    payment_intent_id: paymentIntent.id,
    customer_id: customer.id,
    client_secret: paymentIntent.client_secret,
    amount: paymentIntent.amount,
    currency: 'usd'
  }
})
```

### Option B: Add Stripe-Specific Columns (Optional)

**Pros:**
- Easier SQL queries for Stripe fields
- Better type safety

**Cons:**
- Requires migration
- Less flexible for multi-gateway support

**Migration Example:**
```sql
-- Add Stripe-specific columns (optional)
ALTER TABLE orders ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE orders ADD COLUMN stripe_client_secret TEXT;

-- Create indexes for performance
CREATE INDEX idx_orders_stripe_payment_intent 
  ON orders(stripe_payment_intent_id);
```

**Recommendation:** Use **Option A** (keep generic schema).

---

## 📁 Files To Review

### High Priority (Must Change)
```
supabase/functions/
├── ❌ create-doku-ticket-checkout/        # DELETE
├── ❌ create-doku-product-checkout/       # DELETE
├── ❌ doku-webhook/                       # DELETE
├── ❌ sync-doku-ticket-status/            # DELETE
├── ❌ sync-doku-product-status/           # DELETE
├── ❌ reconcile-doku-payments/            # DELETE
├── ❌ rajaongkir/ (folder)                # DELETE (Indonesia shipping)
├── ✅ create-stripe-ticket-checkout/      # CREATE NEW
├── ✅ create-stripe-product-checkout/     # CREATE NEW
├── ✅ stripe-webhook/                     # CREATE NEW
├── ✅ sync-stripe-payment-status/         # CREATE NEW
└── ✅ calculate-shipping-cost/            # CREATE NEW (EasyPost)

frontend/src/
├── pages/PaymentPage.tsx                  # 🔧 UPDATE (DOKU → Stripe)
├── pages/ProductCheckoutPage.tsx          # 🔧 UPDATE
├── utils/currency.ts                      # 🔧 UPDATE (IDR → USD)
└── utils/payment.ts                       # 🔧 UPDATE
```

### Medium Priority (Review & Update)
```
supabase/migrations/
├── 20260424100000_rename_reconcile_payment_cron_to_doku.sql  # 🔧 UPDATE
└── 20260513000000_add_whatsapp_messages_table.sql           # 🔧 REVIEW (WhatsApp integration)
```

### Low Priority (Documentation)
```
SQL_CLEANUP_REFERENCE.sql                  # 🔍 REVIEW (mentions doku_order_id)
docs/runbooks/doku-payments.md             # 📝 UPDATE → stripe-payments.md
docs/runbooks/rajaongkir-integration.md    # 📝 REMOVE (US doesn't need)
```

---

## 🚀 Recommended Implementation Plan

### Phase 1: Backend Foundation (Day 1-2)
1. ✅ Create Stripe Edge Functions:
   - `create-stripe-ticket-checkout`
   - `create-stripe-product-checkout`
   - `stripe-webhook`
   - `sync-stripe-payment-status`

2. ✅ Test functions locally:
   ```bash
   supabase functions serve
   curl -X POST http://localhost:54321/functions/v1/create-stripe-ticket-checkout
   ```

3. ✅ Deploy functions:
   ```bash
   supabase functions deploy create-stripe-ticket-checkout
   supabase functions deploy stripe-webhook
   ```

### Phase 2: Frontend Integration (Day 3-4)
1. ✅ Install Stripe packages:
   ```bash
   npm install @stripe/stripe-js @stripe/react-stripe-js
   ```

2. 🔧 Update `PaymentPage.tsx`:
   - Remove DOKU Jokul SDK
   - Add Stripe Elements
   - Handle Stripe payment flow

3. 🔧 Update `currency.ts`:
   - Replace `formatRupiah()` with `formatCurrency(amount, 'USD')`

### Phase 3: Testing (Day 5)
1. ✅ Test Stripe payment flow:
   - Use test card: `4242 4242 4242 4242`
   - Verify webhook delivery
   - Check order status updates

2. ✅ Test webhook with Stripe CLI:
   ```bash
   stripe listen --forward-to https://advzkhuulbaztolnttfl.supabase.co/functions/v1/stripe-webhook
   ```

### Phase 4: Cleanup (Day 6)
1. ❌ Delete DOKU functions
2. ❌ Remove DOKU-related migrations (or keep for historical reference)
3. ❌ Update documentation

---

## 🔐 Stripe Secrets (Set via Supabase CLI)

```bash
# After creating Stripe account, set these secrets:
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx
supabase secrets set PUBLIC_APP_URL=http://localhost:5174
```

**Get Stripe keys from:**
- Dashboard: https://dashboard.stripe.com/test/apikeys
- Webhook: https://dashboard.stripe.com/test/webhooks

---

## ✅ Migration Checklist

### Setup
- [x] Install Stripe packages (`@stripe/stripe-js`, `@stripe/react-stripe-js`)
- [x] Create US Supabase project
- [x] Link folder to US project (`supabase link`)
- [x] Update `.env.local` with Supabase credentials
- [ ] Get Stripe test API keys
- [ ] Set Stripe secrets via `supabase secrets set`

### Backend
- [ ] Create `create-stripe-ticket-checkout` function
- [ ] Create `create-stripe-product-checkout` function
- [ ] Create `stripe-webhook` function
- [ ] Create `sync-stripe-payment-status` function
- [ ] Test functions locally
- [ ] Deploy functions to US Supabase
- [ ] Setup Stripe webhook endpoint

### Frontend
- [ ] Update `PaymentPage.tsx` (DOKU → Stripe Elements)
- [ ] Update `ProductCheckoutPage.tsx`
- [ ] Update `currency.ts` (IDR → USD)
- [ ] Update `payment.ts` gateway logic
- [ ] Test payment flow with Stripe test cards

### Testing
- [ ] Test ticket purchase flow
- [ ] Test product purchase flow
- [ ] Test webhook delivery
- [ ] Test payment success/failure
- [ ] Test refund flow
- [ ] Load testing (optional)

### Cleanup
- [ ] Delete DOKU Edge Functions
- [ ] Remove DOKU-related cron jobs
- [ ] Update documentation
- [ ] Remove RajaOngkir shipping functions (if not needed)

---

## 📚 Reference Documents

- **Stripe Examples:** `.agents/skills/sparkstage-us-builder/STRIPE_EXAMPLES.md`
- **Migration Guide:** `.agents/skills/sparkstage-us-builder/SEPARATE_FOLDER_SETUP.md`
- **Quick Start (ID):** `.agents/skills/sparkstage-us-builder/QUICKSTART_ID.md`
- **Database Strategy:** `.agents/skills/sparkstage-us-builder/DATABASE_STRATEGY.md`

---

## 🎉 Conclusion

**Database schema is ready for Stripe!** 

The current generic payment schema (`payment_gateway`, `payment_id`, `payment_data`) can handle Stripe without any migration. Focus on:

1. ✅ Creating Stripe Edge Functions
2. ✅ Updating frontend to use Stripe Elements
3. ✅ Testing payment flow end-to-end

No database migration needed for basic Stripe integration. Optional enhancements (like adding `stripe_payment_intent_id` column) can be done later if needed.

---

**Next Step:** Create Stripe Edge Functions using code examples from `STRIPE_EXAMPLES.md`

