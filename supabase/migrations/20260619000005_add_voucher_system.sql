-- ============================================
-- Migration: Voucher/Discount System for US Database
-- Date: 2026-06-19
-- Description: Add voucher management system with atomic quota tracking
-- ============================================

-- PHASE 1: Create vouchers table
-- ============================================

CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  quota INTEGER NOT NULL CHECK (quota > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  min_purchase NUMERIC CHECK (min_purchase >= 0),
  max_discount NUMERIC CHECK (max_discount >= 0),
  applicable_categories INTEGER[] DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (valid_until > valid_from),
  CONSTRAINT quota_not_exceeded CHECK (used_count <= quota)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON public.vouchers(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON public.vouchers(is_active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_vouchers_categories ON public.vouchers USING GIN(applicable_categories);

-- PHASE 2: Create voucher_usage tracking table
-- ============================================

CREATE TABLE IF NOT EXISTS public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_product_id UUID NOT NULL REFERENCES public.order_products(id) ON DELETE CASCADE,
  discount_amount NUMERIC NOT NULL CHECK (discount_amount >= 0),
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate usage per order
  CONSTRAINT unique_voucher_per_order UNIQUE(order_product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voucher_usage_voucher ON public.voucher_usage(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_user ON public.voucher_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_voucher_usage_order ON public.voucher_usage(order_product_id);

-- PHASE 3: Add voucher columns to order_products (if not exists)
-- ============================================

ALTER TABLE public.order_products 
  ADD COLUMN IF NOT EXISTS voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_products_voucher ON public.order_products(voucher_id);

-- PHASE 4: RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;

-- Vouchers: Public can read active vouchers
CREATE POLICY "Allow public read active vouchers"
  ON public.vouchers
  FOR SELECT
  TO public
  USING (is_active = true AND valid_until > NOW());

-- Vouchers: Admins have full access
CREATE POLICY "Allow admin full access to vouchers"
  ON public.vouchers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      WHERE ura.user_id = auth.uid()
        AND ura.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      WHERE ura.user_id = auth.uid()
        AND ura.role IN ('admin', 'super_admin')
    )
  );

-- Voucher usage: Users can read their own usage
CREATE POLICY "Allow users read own voucher usage"
  ON public.voucher_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Voucher usage: System can insert (for order processing)
CREATE POLICY "Allow authenticated insert voucher usage"
  ON public.voucher_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Voucher usage: Admins can read all
CREATE POLICY "Allow admin read all voucher usage"
  ON public.voucher_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      WHERE ura.user_id = auth.uid()
        AND ura.role IN ('admin', 'super_admin')
    )
  );

-- Grant permissions
GRANT SELECT ON public.vouchers TO anon, authenticated;
GRANT ALL ON public.vouchers TO authenticated;
GRANT SELECT, INSERT ON public.voucher_usage TO authenticated;
GRANT ALL ON public.voucher_usage TO authenticated;

-- Comments
COMMENT ON TABLE public.vouchers IS 'Voucher/discount codes for orders';
COMMENT ON TABLE public.voucher_usage IS 'Tracking voucher usage per order';
