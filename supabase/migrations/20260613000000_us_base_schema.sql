-- ============================================
-- SparkStage US - Base Schema
-- Date: 2026-06-13
-- Description: Fresh base schema for US database
-- Core tables for products, orders, tickets, users
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================
-- USER & PROFILE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'starguide', 'kasir', 'dressing-room-admin', 'devops', 'owner')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- ============================================
-- PRODUCT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#000000',
  parent_id BIGINT REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id BIGINT REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  sku TEXT UNIQUE,
  price BIGINT NOT NULL DEFAULT 0,
  stock BIGINT NOT NULL DEFAULT 0,
  reserved_stock BIGINT NOT NULL DEFAULT 0,
  deposit BIGINT DEFAULT 0,
  attributes JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  provider TEXT DEFAULT 'cloudflare-r2',
  provider_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RETAIL PRODUCT TABLES (E-Commerce)
-- ============================================

CREATE TABLE IF NOT EXISTS public.retail_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id BIGINT REFERENCES public.retail_categories(id),
  department TEXT CHECK (department IN ('glam', 'charmbar', 'sparkclub')),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_retail (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  retail_category_id BIGINT REFERENCES public.retail_categories(id),
  sku TEXT UNIQUE,
  price BIGINT NOT NULL DEFAULT 0,
  stock BIGINT NOT NULL DEFAULT 0,
  variant_name TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'completed', 'cancelled', 'expired')),
  channel TEXT NOT NULL DEFAULT 'online' CHECK (channel IN ('online', 'cashier')),
  payment_gateway TEXT,
  payment_id TEXT,
  payment_url TEXT,
  payment_data JSONB,
  payment_method TEXT,
  gross_amount BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT DEFAULT 0,
  final_amount BIGINT NOT NULL DEFAULT 0,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_hidden BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.order_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES public.product_variants(id),
  quantity INT NOT NULL DEFAULT 1,
  price BIGINT NOT NULL,
  subtotal BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'picked_up', 'cancelled')),
  picked_up_at TIMESTAMPTZ,
  picked_up_by UUID REFERENCES auth.users(id),
  staff_name TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_province TEXT,
  shipping_postal_code TEXT,
  shipping_cost BIGINT DEFAULT 0,
  shipping_service TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TICKET TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_time_slot BOOLEAN DEFAULT true,
  available_from DATE,
  available_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id BIGINT NOT NULL REFERENCES public.tickets(id),
  type_name TEXT NOT NULL,
  price BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_availability (
  id BIGSERIAL PRIMARY KEY,
  ticket_id BIGINT NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_slot TEXT,
  total_capacity INT NOT NULL,
  sold_capacity INT DEFAULT 0,
  reserved_capacity INT DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id, date, time_slot)
);

CREATE TABLE IF NOT EXISTS public.purchased_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id BIGINT NOT NULL REFERENCES public.tickets(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  order_id UUID REFERENCES public.orders(id),
  ticket_code TEXT NOT NULL UNIQUE,
  queue_number INT,
  selected_date DATE NOT NULL,
  selected_time TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'used', 'cancelled', 'expired')),
  payment_gateway TEXT,
  payment_id TEXT,
  payment_data JSONB,
  gross_amount BIGINT,
  scanned_at TIMESTAMPTZ,
  scanned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  is_hidden BOOLEAN DEFAULT false
);

-- ============================================
-- RENTAL/DRESSING ROOM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.dressing_room_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES public.dressing_room_categories(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rental_date DATE NOT NULL,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'rented', 'returned', 'cancelled')),
  payment_gateway TEXT,
  payment_id TEXT,
  payment_data JSONB,
  gross_amount BIGINT NOT NULL DEFAULT 0,
  deposit_amount BIGINT DEFAULT 0,
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'admin', 'cashier')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rental_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id UUID NOT NULL REFERENCES public.rental_orders(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES public.product_variants(id),
  quantity INT NOT NULL DEFAULT 1,
  rental_price BIGINT NOT NULL,
  deposit BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'rented', 'returned', 'lost', 'damaged')),
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STOCK MANAGEMENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.stock_opening (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_number TEXT NOT NULL UNIQUE,
  opening_date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_opening_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_opening_id UUID NOT NULL REFERENCES public.stock_opening(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES public.product_variants(id),
  opening_stock BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_opening_id, product_variant_id)
);

CREATE TABLE IF NOT EXISTS public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number TEXT NOT NULL UNIQUE,
  adjustment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('gift', 'kol', 'loss', 'gain', 'other')),
  reason TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT 'main',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_adjustment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_adjustment_id UUID NOT NULL REFERENCES public.stock_adjustments(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES public.product_variants(id),
  quantity_change BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_adjustment_id, product_variant_id)
);

CREATE TABLE IF NOT EXISTS public.stock_opname (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opname_number TEXT NOT NULL UNIQUE,
  opname_date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT 'main',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  finalized_by UUID REFERENCES auth.users(id),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stock_opname_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_opname_id UUID NOT NULL REFERENCES public.stock_opname(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES public.product_variants(id),
  physical_count BIGINT NOT NULL DEFAULT 0,
  system_stock BIGINT NOT NULL DEFAULT 0,
  variance BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stock_opname_id, product_variant_id)
);

-- ============================================
-- DISCOUNT & VOUCHER TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.discounts (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value BIGINT NOT NULL,
  channel TEXT DEFAULT 'online' CHECK (channel IN ('online', 'cashier', 'all')),
  min_purchase BIGINT,
  usage_limit INT,
  usage_count INT DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.discount_products (
  id BIGSERIAL PRIMARY KEY,
  discount_id BIGINT NOT NULL REFERENCES public.discounts(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id),
  category_id BIGINT REFERENCES public.categories(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOYALTY & REFERRAL TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.customer_loyalty_points (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points BIGINT NOT NULL DEFAULT 0,
  tier_level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.loyalty_points_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  points BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  referee_id UUID NOT NULL REFERENCES auth.users(id),
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  reward_points BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referee_id)
);

-- ============================================
-- CMS & CONTENT TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.banners (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  title_image_url TEXT,
  link_url TEXT,
  banner_type TEXT DEFAULT 'landscape' CHECK (banner_type IN ('landscape', 'portrait', 'square')),
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.news_posts (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  extra_sections JSONB,
  section_order INT[] DEFAULT ARRAY[]::INT[],
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT & LOGGING TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INT DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DIVISION & ADMIN TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, division_id)
);

-- ============================================
-- APP CONFIG TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_configs (
  id SERIAL PRIMARY KEY,
  font_family TEXT NOT NULL DEFAULT 'Inter',
  url_font TEXT,
  is_custom BOOLEAN DEFAULT false,
  phone_contact TEXT,
  email_contact TEXT,
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Product indexes
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku) WHERE deleted_at IS NULL;

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_products_order ON public.order_products(order_id);

-- Ticket indexes
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_user ON public.purchased_tickets(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_status ON public.purchased_tickets(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchased_tickets_date ON public.purchased_tickets(selected_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ticket_availability_date ON public.ticket_availability(ticket_id, date);

-- Stock indexes
CREATE INDEX IF NOT EXISTS idx_stock_opening_date ON public.stock_opening(opening_date);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_date ON public.stock_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_stock_opname_date ON public.stock_opname(opname_date);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_product_variants_name_trgm ON public.product_variants USING gin(variant_name gin_trgm_ops) WHERE deleted_at IS NULL;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Base schema created successfully!';
  RAISE NOTICE '📊 Created core tables for: products, orders, tickets, rentals, stock management';
  RAISE NOTICE '🔄 Next step: Apply remaining incremental migrations';
END $$;
