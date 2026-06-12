# Setup SparkStage US - Separate Folder Guide

## 📁 Struktur Folder

```
C:\SparkDoku\
├── sparkstage\          ← Versi Indonesia (original)
│   ├── frontend\
│   ├── supabase\
│   ├── package.json
│   └── .env.local       (DOKU credentials)
│
└── sparkstageus\        ← Versi US (copy baru)
    ├── frontend\
    ├── supabase\
    ├── package.json
    └── .env.local       (Stripe credentials - BEDA!)
```

## 🚀 Step-by-Step Setup

### Step 1: Copy Folder (SUDAH DILAKUKAN ✅)

```powershell
# Anda sudah copy folder sparkstage → sparkstageus
# Good job! 👍
```

### Step 2: Masuk ke Folder US

```powershell
cd C:\SparkDoku\sparkstageus
```

### Step 3: Clean Up Git (Penting!)

```powershell
# Hapus git history dari Indonesia version
Remove-Item -Recurse -Force .git

# Initialize git baru untuk US version
git init
git branch -M main
```

### Step 4: Update Package Names

Edit `package.json` di root folder:

```powershell
notepad package.json
```

Ubah:
```json
{
  "name": "sparkstage-us",  // ← Ubah dari "spark-photo-studio"
  "version": "1.0.0",
  "description": "SparkStage US Version with Stripe payments"
}
```

Edit `frontend/package.json`:

```powershell
notepad frontend\package.json
```

Ubah:
```json
{
  "name": "sparkstage-us-frontend"  // ← Ubah
}
```

### Step 5: Install Dependencies

```powershell
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install Stripe dependencies
npm install @stripe/stripe-js@^2.4.0 @stripe/react-stripe-js@^2.4.0

# Back to root
cd ..
```

### Step 6: Setup Environment Variables

```powershell
# Copy environment template
copy .env.us-example .env.local

# Edit dengan Notepad
notepad .env.local
```

**Isi dengan credentials US (BUKAN Indonesia!):**

```bash
# Supabase (US Project - BEDA dari Indonesia!)
VITE_SUPABASE_URL=https://xxxxx.supabase.co  # US project URL
VITE_SUPABASE_ANON_KEY=eyJhbGc...             # US project key

# App URL (US domain)
VITE_APP_URL=https://sparkstage-us.vercel.app

# Stripe (US Payment Gateway)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx    # Stripe test key

# Locale & Currency
VITE_CURRENCY=USD
VITE_LOCALE=en-US
```

### Step 7: Create New Supabase Project

1. **Go to Supabase Dashboard:**
   ```
   https://supabase.com/dashboard
   ```

2. **Create New Project:**
   - Click: "New Project"
   - Organization: Your organization
   - Name: `sparkstage-us`
   - Database Password: [strong password - SAVE IT!]
   - Region: **US West (Oregon)** or **US East (N. Virginia)**
   - Pricing Plan: Pro ($25/month)

3. **Get Project URL & Keys:**
   - Go to: Settings > API
   - Copy:
     - Project URL
     - anon public key
     - service_role key (secret!)

4. **Update `.env.local`** dengan keys yang baru didapat

### Step 8: Initialize Supabase CLI

```powershell
# Link to US project
supabase link --project-ref [US-PROJECT-REF]

# Enter database password when prompted
```

**Get project ref from:**
- Supabase Dashboard > Settings > General
- Format: `abcdefghijklmnop` (16 characters)

### Step 9: Update Database Migrations

**Option A: Modify Existing Migrations (Recommended)**

```powershell
# Edit migration files
cd supabase\migrations

# List all migrations
dir
```

Untuk setiap migration yang menyebut DOKU, edit dan ganti dengan Stripe:

```powershell
# Example: Edit migration file
notepad 20230101000000_create_orders_table.sql
```

**Ubah dari:**
```sql
-- DOKU columns
doku_order_id TEXT,
doku_invoice_number TEXT,
doku_payment_url TEXT,
```

**Ke:**
```sql
-- Stripe columns
stripe_payment_intent_id TEXT,
stripe_customer_id TEXT,
stripe_client_secret TEXT,
```

**Option B: Create New Migration (Alternative)**

```powershell
# Create new migration
supabase migration new update_to_stripe_payments

# Edit the new migration file
notepad supabase\migrations\[TIMESTAMP]_update_to_stripe_payments.sql
```

Add:
```sql
-- Replace DOKU columns with Stripe columns
ALTER TABLE orders 
DROP COLUMN IF EXISTS doku_order_id,
DROP COLUMN IF EXISTS doku_invoice_number,
DROP COLUMN IF EXISTS doku_payment_url,
ADD COLUMN stripe_payment_intent_id TEXT UNIQUE,
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_client_secret TEXT;

-- Similar for order_products table
ALTER TABLE order_products
DROP COLUMN IF EXISTS doku_order_id,
DROP COLUMN IF EXISTS doku_invoice_number,
ADD COLUMN stripe_payment_intent_id TEXT UNIQUE,
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_client_secret TEXT;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent 
ON orders(stripe_payment_intent_id);
```

### Step 10: Push Migrations to US Database

```powershell
# Push all migrations
npm run supabase:db:push

# Or manually:
supabase db push
```

**Expected output:**
```
✓ Connecting to remote database...
✓ Running migration 20230101000000_create_orders_table.sql...
✓ Running migration 20230101000001_add_stripe_columns.sql...
✓ Finished running migrations.
```

### Step 11: Set Supabase Secrets (US Project)

```powershell
# Stripe secrets (TEST MODE first!)
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# EasyPost (if using shipping)
supabase secrets set EASYPOST_API_KEY=EZAK...

# App configuration
supabase secrets set PUBLIC_APP_URL=https://sparkstage-us.vercel.app
supabase secrets set APP_ALLOWED_ORIGINS=https://sparkstage-us.vercel.app

# Verify secrets
supabase secrets list
```

### Step 12: Delete/Replace Edge Functions

**Delete DOKU functions:**
```powershell
cd supabase\functions

# Delete DOKU-related functions
Remove-Item -Recurse create-doku-ticket-checkout
Remove-Item -Recurse create-doku-product-checkout
Remove-Item -Recurse doku-webhook
Remove-Item -Recurse sync-doku-ticket-status
Remove-Item -Recurse sync-doku-product-status

# Delete RajaOngkir proxy
Remove-Item -Recurse rajaongkir
```

**Create Stripe functions:**
```powershell
# Create new Stripe functions
supabase functions new create-stripe-ticket-checkout
supabase functions new create-stripe-product-checkout
supabase functions new stripe-webhook
supabase functions new sync-stripe-payment-status

# Create shipping function
supabase functions new calculate-shipping-cost
```

Copy code dari dokumentasi `STRIPE_EXAMPLES.md` ke dalam function files.

### Step 13: Test Locally

```powershell
# Terminal 1: Start Supabase local
supabase start

# Terminal 2: Start frontend dev server
cd frontend
npm run dev

# Terminal 3: Forward Stripe webhooks (if testing webhooks)
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

**Open browser:**
```
http://localhost:5173
```

### Step 14: Update Frontend Code

**Replace DOKU code with Stripe:**

Files to update:
- `frontend/src/pages/PaymentPage.tsx`
- `frontend/src/pages/ProductCheckoutPage.tsx`
- `frontend/src/pages/BookingSuccessPage.tsx`

**Example: PaymentPage.tsx**

Delete DOKU code, add Stripe Elements (see `STRIPE_EXAMPLES.md`)

### Step 15: Deploy to Production

**Deploy Frontend (Vercel):**

```powershell
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Deploy from sparkstageus folder
cd C:\SparkDoku\sparkstageus\frontend
vercel deploy --prod
```

**During deployment, set environment variables:**
- `VITE_SUPABASE_URL` = US Supabase project URL
- `VITE_SUPABASE_ANON_KEY` = US Supabase anon key
- `VITE_STRIPE_PUBLISHABLE_KEY` = pk_live_xxxxx (production!)
- `VITE_APP_URL` = Your Vercel deployment URL
- `VITE_CURRENCY` = USD
- `VITE_LOCALE` = en-US

**Deploy Edge Functions:**

```powershell
cd C:\SparkDoku\sparkstageus

# Deploy all functions
supabase functions deploy
```

---

## 🎯 Running Both Versions Simultaneously

### Indonesia Version (sparkstage)

```powershell
# Terminal 1: Indonesia
cd C:\SparkDoku\sparkstage
npm run dev

# Runs on: http://localhost:5173
# Uses: DOKU payment, RajaOngkir shipping
# Database: Indonesia Supabase project
```

### US Version (sparkstageus)

```powershell
# Terminal 2: US
cd C:\SparkDoku\sparkstageus
npm run dev

# ERROR! Port 5173 already in use!
```

**Solution: Change port for US version**

Edit `sparkstageus/frontend/package.json`:

```json
{
  "scripts": {
    "dev": "vite --port 5174",  // ← Ubah port ke 5174
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5174"
  }
}
```

Or edit `sparkstageus/vite.config.ts`:

```typescript
export default defineConfig({
  server: {
    port: 5174  // ← US version uses port 5174
  }
})
```

Now both can run together:
- Indonesia: http://localhost:5173
- US: http://localhost:5174

---

## 📋 Quick Reference Commands

### Working with Indonesia Version
```powershell
cd C:\SparkDoku\sparkstage
npm run dev                    # Port 5173
npm run build
npm run supabase:db:push
```

### Working with US Version
```powershell
cd C:\SparkDoku\sparkstageus
npm run dev                    # Port 5174 (different!)
npm run build
npm run supabase:db:push       # Pushes to US database
```

### Switching Between Projects

```powershell
# Check current Supabase project
supabase projects list

# Link to different project
supabase link --project-ref [PROJECT-REF]
```

---

## 🔐 Security Checklist

- [ ] `.env.local` in both folders are different
- [ ] US version uses US Supabase project
- [ ] Indonesia version still uses Indonesia Supabase project
- [ ] Stripe keys in US version only
- [ ] DOKU keys in Indonesia version only
- [ ] Both `.env.local` files in `.gitignore`
- [ ] Separate git repositories (separate `.git` folders)

---

## ⚠️ Common Issues

### Issue 1: "Port already in use"
**Solution:** Change US version to port 5174 (see above)

### Issue 2: "Supabase project not found"
**Solution:** Make sure you're in correct folder and run `supabase link`

### Issue 3: "Wrong database when running migrations"
**Solution:**
```powershell
# Check which project you're linked to
supabase projects list

# Re-link to correct project
cd C:\SparkDoku\sparkstageus
supabase link --project-ref [US-PROJECT-REF]
```

### Issue 4: "Environment variables not loading"
**Solution:** Make sure `.env.local` exists in correct folder:
- Indonesia: `C:\SparkDoku\sparkstage\.env.local`
- US: `C:\SparkDoku\sparkstageus\.env.local`

### Issue 5: "Stripe not defined"
**Solution:**
```powershell
cd C:\SparkDoku\sparkstageus\frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

---

## 📊 Folder Comparison

| Aspect | Indonesia (sparkstage) | US (sparkstageus) |
|--------|----------------------|-------------------|
| **Location** | `C:\SparkDoku\sparkstage` | `C:\SparkDoku\sparkstageus` |
| **Dev Port** | 5173 | 5174 |
| **Database** | Indonesia Supabase project | US Supabase project |
| **Payment** | DOKU | Stripe |
| **Shipping** | RajaOngkir | EasyPost |
| **Currency** | IDR | USD |
| **Git** | Original repo | New repo |
| **Deploy** | vercel (indo domain) | vercel (us domain) |

---

## ✅ Final Checklist

- [ ] Folder `sparkstageus` created (copy from `sparkstage`)
- [ ] Git initialized separately (`rm -rf .git && git init`)
- [ ] Dependencies installed (`npm install`)
- [ ] Stripe packages installed
- [ ] `.env.local` created with US credentials
- [ ] New Supabase project created (US region)
- [ ] Supabase CLI linked to US project
- [ ] Migrations updated (DOKU → Stripe)
- [ ] Migrations pushed to US database
- [ ] Supabase secrets set (Stripe keys)
- [ ] Edge functions updated/created
- [ ] Frontend code updated (Stripe integration)
- [ ] Dev port changed to 5174
- [ ] Local testing successful
- [ ] Ready to deploy!

---

## 🎉 Success!

Anda sekarang punya 2 folder terpisah:

```
C:\SparkDoku\
├── sparkstage\       → Indonesia version (DOKU, RajaOngkir)
└── sparkstageus\     → US version (Stripe, EasyPost)
```

Keduanya bisa jalan independent, punya database terpisah, dan payment gateway berbeda!

**Next:** Follow `QUICKSTART_ID.md` untuk detailed implementation steps.
