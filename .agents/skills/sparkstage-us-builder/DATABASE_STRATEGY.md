# Database Strategy - SparkStage US

## 🎯 Konsep: Separate Databases, Same Schema

### Strategi Database

```
┌─────────────────────────────────────────────────────────────┐
│                    Indonesia Version                        │
│                                                             │
│  Supabase Project: sparkstage-indonesia                    │
│  Database: PostgreSQL (Indonesia customers)                │
│                                                             │
│  Tables:                                                    │
│  - orders (doku_order_id, doku_payment_url)                │
│  - order_products                                          │
│  - purchased_tickets                                       │
│  - product_variants                                        │
│  - ... (all other tables)                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       US Version                            │
│                                                             │
│  Supabase Project: sparkstage-us                           │
│  Database: PostgreSQL (US customers) - SEPARATE!           │
│                                                             │
│  Tables: (SAME STRUCTURE!)                                 │
│  - orders (stripe_payment_intent_id, stripe_client_secret) │
│  - order_products                                          │
│  - purchased_tickets                                       │
│  - product_variants                                        │
│  - ... (all other tables - SAME!)                          │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Kenapa Dipisah?

### 1. **Data Compliance & Privacy**
- 🇮🇩 **Indonesia:** Customer data harus stay di region Asia
- 🇺🇸 **US:** Customer data harus stay di region US (GDPR, CCPA compliance)
- Supabase allows you to choose database region

### 2. **Payment Integration**
- 🇮🇩 **Indonesia:** DOKU payment gateway (IDR)
- 🇺🇸 **US:** Stripe payment gateway (USD)
- Different payment columns needed

### 3. **Performance**
- Database closer to customers = faster queries
- Indonesia DB → Asia region
- US DB → US region

### 4. **Business Separation**
- Separate customer bases
- Separate financial reporting
- Easier accounting per market

## 📊 Tabel Yang SAMA

### Core Tables (100% Same Structure)

```sql
-- Users & Auth (sama persis)
- users
- user_profiles
- user_role_assignments

-- Product Catalog (sama persis)
- products
- product_variants
- product_categories
- retail_categories
- product_retail

-- Inventory (sama persis)
- stock_openings
- stock_opening_items
- stock_adjustments
- stock_adjustment_items
- stock_opname
- stock_opname_items

-- Vouchers (sama persis)
- vouchers
- voucher_usage

-- Tickets (sama persis)
- tickets
- ticket_variants
- purchased_tickets

-- Admin (sama persis)
- banners
- settings
```

## 🔄 Tabel Yang BEDA (Payment Columns Only)

### orders table

**Indonesia Version:**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount DECIMAL,
  status TEXT,
  
  -- DOKU specific columns
  doku_order_id TEXT,
  doku_invoice_number TEXT,
  doku_payment_url TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**US Version:**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount DECIMAL,
  status TEXT,
  
  -- Stripe specific columns (DIFFERENT!)
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  stripe_client_secret TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### order_products table

**Indonesia Version:**
```sql
CREATE TABLE order_products (
  id UUID PRIMARY KEY,
  order_number TEXT,
  customer_name TEXT,
  subtotal DECIMAL,
  shipping_cost DECIMAL,
  total_amount DECIMAL,
  payment_status TEXT,
  
  -- DOKU specific
  doku_order_id TEXT,
  doku_invoice_number TEXT,
  
  -- RajaOngkir shipping
  shipping_service TEXT, -- "JNE REG"
  shipping_etd TEXT,     -- "2-3 hari"
  
  created_at TIMESTAMPTZ
);
```

**US Version:**
```sql
CREATE TABLE order_products (
  id UUID PRIMARY KEY,
  order_number TEXT,
  customer_name TEXT,
  subtotal DECIMAL,
  shipping_cost DECIMAL,
  total_amount DECIMAL,
  payment_status TEXT,
  
  -- Stripe specific (DIFFERENT!)
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  
  -- EasyPost shipping (DIFFERENT!)
  easypost_shipment_id TEXT,
  easypost_tracker_id TEXT,
  carrier TEXT,          -- "USPS", "FedEx", "UPS"
  service TEXT,          -- "Priority", "Ground"
  tracking_number TEXT,
  
  created_at TIMESTAMPTZ
);
```

## 🚀 Migration Strategy

### Option 1: New Supabase Project (Recommended)

```bash
# Step 1: Create NEW Supabase project
# Go to: https://supabase.com/dashboard
# Click: "New Project"
# Name: sparkstage-us
# Region: US West (Oregon) or US East (N. Virginia)
# Database password: [strong password]

# Step 2: Copy migration files
cp -r sparkstage-indonesia/supabase/migrations sparkstage-us/supabase/migrations

# Step 3: Modify payment columns in migrations
# Edit each migration file to use Stripe columns instead of DOKU

# Step 4: Run migrations
cd sparkstage-us
supabase db push

# Step 5: Seed initial data (products, settings)
# (Manual or via seed scripts)
```

### Option 2: Clone & Modify Schema

```bash
# Step 1: Clone existing project structure
git clone sparkstage-indonesia sparkstage-us

# Step 2: Initialize new Supabase project
cd sparkstage-us
supabase init

# Step 3: Link to new Supabase project
supabase link --project-ref [new-us-project-ref]

# Step 4: Create migration for Stripe columns
supabase migration new convert_to_stripe_payments

# Step 5: Push migrations
supabase db push
```

## 📋 Step-by-Step Database Setup

### 1. Create Migration File

```bash
# In sparkstage-us project
supabase migration new initial_us_setup
```

### 2. Migration SQL (Replace DOKU with Stripe)

```sql
-- File: supabase/migrations/XXXXXX_initial_us_setup.sql

-- =====================================================
-- PART 1: Create all tables (SAME as Indonesia)
-- =====================================================

-- Copy all CREATE TABLE statements from Indonesia migrations
-- BUT modify these tables:

-- Orders table (with Stripe columns)
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Stripe columns (DIFFERENT from DOKU!)
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_client_secret TEXT,
  
  paid_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order products table (with Stripe + EasyPost)
CREATE TABLE order_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  
  -- Stripe columns (DIFFERENT!)
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_client_secret TEXT,
  
  -- EasyPost shipping (DIFFERENT!)
  easypost_shipment_id TEXT,
  easypost_tracker_id TEXT,
  carrier TEXT,           -- "USPS", "FedEx", "UPS"
  service TEXT,           -- "Priority Mail", "Ground"
  tracking_number TEXT,
  
  -- Shipping address
  shipping_street TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_zip TEXT,
  shipping_country TEXT DEFAULT 'US',
  
  pickup_code TEXT,
  pickup_qr_code TEXT,
  
  paid_at TIMESTAMPTZ,
  payment_expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- All other tables (SAME as Indonesia)
-- Copy from Indonesia migrations:
-- - users, user_profiles, user_role_assignments
-- - products, product_variants, product_categories
-- - stock_openings, stock_adjustments, stock_opname
-- - vouchers, tickets, banners, settings
-- etc...

-- =====================================================
-- PART 2: Indexes (SAME + add Stripe indexes)
-- =====================================================

CREATE INDEX idx_orders_stripe_payment_intent 
ON orders(stripe_payment_intent_id);

CREATE INDEX idx_order_products_stripe_payment_intent 
ON order_products(stripe_payment_intent_id);

-- Copy all other indexes from Indonesia

-- =====================================================
-- PART 3: RLS Policies (SAME as Indonesia)
-- =====================================================

-- Copy ALL RLS policies from Indonesia migrations
-- No changes needed!

-- =====================================================
-- PART 4: Functions (MODIFY payment-related only)
-- =====================================================

-- Copy all RPC functions
-- Modify only payment-related functions to use Stripe columns
```

### 3. Push Migration

```bash
npm run supabase:db:push
```

## 🔐 Data Isolation

### Indonesia Database
- **Contains:** Indonesia customers only
- **Payment Gateway:** DOKU only
- **Currency:** IDR only
- **Region:** Asia (Singapore recommended)

### US Database
- **Contains:** US customers only
- **Payment Gateway:** Stripe only
- **Currency:** USD only
- **Region:** US West or US East

### No Shared Data
- ❌ No cross-database queries
- ❌ No data replication between databases
- ✅ Complete isolation per market

## 📦 Product Catalog Sync (Optional)

Jika Anda ingin produk yang sama di kedua market:

### Option A: Manual Sync (Simple)
```bash
# Export from Indonesia
pg_dump indonesia_db --table=products > products.sql

# Import to US (edit prices to USD first!)
psql us_db < products.sql
```

### Option B: Admin UI Sync (Advanced)
```typescript
// Future enhancement: Admin can sync products
async function syncProductToUS(productId: string) {
  const product = await indonesiaDB.from('products').select('*').eq('id', productId)
  
  // Convert price IDR to USD
  const usdPrice = product.price_idr / 15000 // Example conversion rate
  
  await usDB.from('products').insert({
    ...product,
    price_usd: usdPrice
  })
}
```

### Option C: Keep Separate (Recommended)
- Indonesia products untuk market Indonesia
- US products untuk market US
- Bisa beda pricing, beda catalog

## 🔄 Environment Configuration

### Indonesia Project
```bash
# .env.indonesia
VITE_SUPABASE_URL=https://xxxxx.supabase.co  # Indonesia project
VITE_SUPABASE_ANON_KEY=eyJhbGc...             # Indonesia key
VITE_CURRENCY=IDR
VITE_LOCALE=id-ID
VITE_DOKU_PUBLISHABLE_KEY=...
```

### US Project
```bash
# .env.us
VITE_SUPABASE_URL=https://yyyyy.supabase.co  # US project (DIFFERENT!)
VITE_SUPABASE_ANON_KEY=eyJhbGc...             # US key (DIFFERENT!)
VITE_CURRENCY=USD
VITE_LOCALE=en-US
VITE_STRIPE_PUBLISHABLE_KEY=...
```

## 💰 Cost Implications

### Single Database (NOT Recommended)
- ❌ One Supabase project
- ❌ Slower for one market (distance)
- ❌ Compliance issues
- Cost: $25/month

### Separate Databases (Recommended)
- ✅ Two Supabase projects
- ✅ Fast for both markets
- ✅ Compliant with regulations
- Cost: $25/month × 2 = **$50/month**

**Worth it for:** Performance, compliance, data isolation

## 🎯 Summary

| Aspect | Strategy |
|--------|----------|
| **Number of Databases** | 2 (separate Supabase projects) |
| **Table Structure** | 95% same, only payment columns different |
| **Data Sharing** | None (complete isolation) |
| **Product Catalog** | Can be synced or kept separate |
| **Migrations** | Copy & modify payment columns |
| **Cost** | 2× Supabase subscription ($50/month total) |
| **Complexity** | Low (same structure = easy to maintain) |

## ✅ Checklist

- [ ] Create new Supabase project (sparkstage-us)
- [ ] Choose US region for database
- [ ] Copy migration files from Indonesia project
- [ ] Modify payment-related tables (orders, order_products)
- [ ] Change DOKU columns → Stripe columns
- [ ] Change RajaOngkir columns → EasyPost columns
- [ ] Keep all other tables exactly the same
- [ ] Run migrations on US database
- [ ] Verify table structure matches
- [ ] Set up separate environment variables
- [ ] Test database connection

**Result:** Dua database terpisah dengan struktur yang 95% sama, hanya beda di payment gateway columns! 🎉
