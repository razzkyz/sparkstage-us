-- ============================================
-- Migration: Dressing Room Products System
-- Date: 2026-05-26
-- Description: Create separate product catalog and inventory system for dressing room
-- - dressing_room_products: Product catalog
-- - dressing_room_product_variants: Variants with inventory & deposit
-- - rental_item_status_history: Track rental item status changes
-- - RTL invoice support for dressing room
-- ============================================

-- ============================================
-- 1. Dressing Room Products Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.dressing_room_products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'clothing',
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dressing_room_products_slug ON public.dressing_room_products(slug);
CREATE INDEX IF NOT EXISTS idx_dressing_room_products_category ON public.dressing_room_products(category);
CREATE INDEX IF NOT EXISTS idx_dressing_room_products_is_active ON public.dressing_room_products(is_active);

-- ============================================
-- 2. Dressing Room Product Variants Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.dressing_room_product_variants (
  id BIGSERIAL PRIMARY KEY,
  dressing_room_product_id BIGINT NOT NULL REFERENCES public.dressing_room_products(id) ON DELETE CASCADE,
  
  -- Variant details
  name TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  size_label TEXT,
  color TEXT,
  
  -- Pricing & Deposit
  price INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  daily_rental_fee INTEGER NOT NULL DEFAULT 15000,
  
  -- Inventory
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  damaged_quantity INTEGER NOT NULL DEFAULT 0,
  in_laundry_quantity INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dressing_room_variants_product_id ON public.dressing_room_product_variants(dressing_room_product_id);
CREATE INDEX IF NOT EXISTS idx_dressing_room_variants_sku ON public.dressing_room_product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_dressing_room_variants_is_active ON public.dressing_room_product_variants(is_active);

-- ============================================
-- 3. Rental Item Status History (Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.rental_item_status_history (
  id BIGSERIAL PRIMARY KEY,
  rental_order_id BIGINT NOT NULL REFERENCES public.rental_orders(id) ON DELETE CASCADE,
  rental_order_item_id BIGINT NOT NULL REFERENCES public.rental_order_items(id) ON DELETE CASCADE,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN (
    'rented',           -- Sedang disewa
    'in_laundry',       -- Dalam proses laundry
    'damaged',          -- Rusak/cacat
    'returned_pending', -- Pending verifikasi return
    'returned',         -- Sudah dikembalikan & diverifikasi
    'lost',             -- Hilang
    'hold'              -- Ditahan (pending charge)
  )),
  
  -- Status transition metadata
  previous_status TEXT,
  reason TEXT,
  notes TEXT,
  
  -- Photos/proof for transitions
  photo_urls TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rental_item_status_history_rental_order_id ON public.rental_item_status_history(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_rental_item_status_history_item_id ON public.rental_item_status_history(rental_order_item_id);
CREATE INDEX IF NOT EXISTS idx_rental_item_status_history_status ON public.rental_item_status_history(status);

-- ============================================
-- 4. Add Status Tracking to Rental Order Items
-- ============================================
ALTER TABLE public.rental_order_items ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'rented' CHECK (current_status IN (
  'rented', 'in_laundry', 'damaged', 'returned_pending', 'returned', 'lost', 'hold'
));

ALTER TABLE public.rental_order_items ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_rental_order_items_current_status ON public.rental_order_items(current_status);

-- ============================================
-- 5. Add RTL Invoice Flag to Rental Orders
-- ============================================
ALTER TABLE public.rental_orders ADD COLUMN IF NOT EXISTS invoice_rtl BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- 6. Enable RLS
-- ============================================
ALTER TABLE public.dressing_room_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dressing_room_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_item_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS Policies - Dressing Room Products
-- ============================================
-- Public: Read active products
CREATE POLICY "Public read active dressing_room_products" ON public.dressing_room_products
  FOR SELECT USING (is_active = true AND is_deleted = false);

-- Admin: Full access
CREATE POLICY "Admin full access dressing_room_products" ON public.dressing_room_products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Dressing Room Admin: Read only
CREATE POLICY "Dressing room admin read dressing_room_products" ON public.dressing_room_products
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'user_role' = 'dressing_room_admin');

-- ============================================
-- 8. RLS Policies - Dressing Room Product Variants
-- ============================================
-- Public: Read active variants
CREATE POLICY "Public read active dressing_room_product_variants" ON public.dressing_room_product_variants
  FOR SELECT USING (is_active = true AND is_deleted = false);

-- Admin: Full access
CREATE POLICY "Admin full access dressing_room_product_variants" ON public.dressing_room_product_variants
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Dressing Room Admin: Read & update inventory
CREATE POLICY "Dressing room admin manage variants" ON public.dressing_room_product_variants
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'user_role' = 'dressing_room_admin');

-- ============================================
-- 9. RLS Policies - Rental Item Status History
-- ============================================
-- User: Read their own rental order status history
CREATE POLICY "User read own rental item status" ON public.rental_item_status_history
  FOR SELECT TO authenticated
  USING (
    rental_order_id IN (
      SELECT id FROM public.rental_orders 
      WHERE user_id = auth.uid()
    )
  );

-- Admin & Dressing Room Admin: Full access
CREATE POLICY "Admin full access rental_item_status_history" ON public.rental_item_status_history
  FOR ALL TO authenticated
  USING (
    public.is_admin() OR auth.jwt() ->> 'user_role' = 'dressing_room_admin'
  )
  WITH CHECK (
    public.is_admin() OR auth.jwt() ->> 'user_role' = 'dressing_room_admin'
  );

-- ============================================
-- 10. Update Rental Order Items - Reference DR Products
-- ============================================
-- Note: rental_order_items currently references products + product_variants
-- We'll update it to also support dressing_room products optionally
-- by adding dr_product_variant_id column alongside existing product_variant_id

ALTER TABLE public.rental_order_items ADD COLUMN IF NOT EXISTS dressing_room_product_variant_id BIGINT REFERENCES public.dressing_room_product_variants(id) ON DELETE SET NULL;

-- ============================================
-- 11. Triggers for Updated At
-- ============================================
CREATE OR REPLACE FUNCTION public.update_dressing_room_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dressing_room_products_updated_at
BEFORE UPDATE ON public.dressing_room_products
FOR EACH ROW
EXECUTE FUNCTION public.update_dressing_room_products_updated_at();

CREATE OR REPLACE FUNCTION public.update_dressing_room_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dressing_room_variants_updated_at
BEFORE UPDATE ON public.dressing_room_product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_dressing_room_variants_updated_at();

-- ============================================
-- 12. RPC: Update Rental Item Status
-- ============================================
CREATE OR REPLACE FUNCTION public.update_rental_item_status(
  p_rental_order_item_id BIGINT,
  p_new_status TEXT,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_photo_urls TEXT[] DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_rental_order_id BIGINT;
  v_previous_status TEXT;
  v_result JSONB;
BEGIN
  -- Get rental order ID & current status
  SELECT roi.rental_order_id, roi.current_status
  INTO v_rental_order_id, v_previous_status
  FROM public.rental_order_items roi
  WHERE roi.id = p_rental_order_item_id;

  IF v_rental_order_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Rental order item not found');
  END IF;

  -- Validate status transition
  IF p_new_status NOT IN ('rented', 'in_laundry', 'damaged', 'returned_pending', 'returned', 'lost', 'hold') THEN
    RETURN jsonb_build_object('error', 'Invalid status: ' || p_new_status);
  END IF;

  -- Update item status
  UPDATE public.rental_order_items
  SET 
    current_status = p_new_status,
    status_updated_at = NOW()
  WHERE id = p_rental_order_item_id;

  -- Record status history
  INSERT INTO public.rental_item_status_history (
    rental_order_id,
    rental_order_item_id,
    status,
    previous_status,
    reason,
    notes,
    photo_urls,
    created_by
  ) VALUES (
    v_rental_order_id,
    p_rental_order_item_id,
    p_new_status,
    v_previous_status,
    p_reason,
    p_notes,
    COALESCE(p_photo_urls, '{}'),
    auth.uid()
  );

  v_result := jsonb_build_object(
    'success', true,
    'item_id', p_rental_order_item_id,
    'previous_status', v_previous_status,
    'new_status', p_new_status,
    'updated_at', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_rental_item_status(BIGINT, TEXT, TEXT, TEXT, TEXT[]) 
TO authenticated;

-- ============================================
-- 13. RPC: Get Rental Item Status History
-- ============================================
CREATE OR REPLACE FUNCTION public.get_rental_item_status_history(
  p_rental_order_item_id BIGINT
)
RETURNS TABLE (
  id BIGINT,
  status TEXT,
  previous_status TEXT,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rish.id,
    rish.status,
    rish.previous_status,
    rish.reason,
    rish.notes,
    rish.created_at,
    au.email
  FROM public.rental_item_status_history rish
  LEFT JOIN auth.users au ON rish.created_by = au.id
  WHERE rish.rental_order_item_id = p_rental_order_item_id
  ORDER BY rish.created_at DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_rental_item_status_history(BIGINT)
TO authenticated;

-- ============================================
-- 14. RPC: Update Dressing Room Variant Inventory
-- ============================================
CREATE OR REPLACE FUNCTION public.update_dressing_room_variant_inventory(
  p_variant_id BIGINT,
  p_total_qty INT DEFAULT NULL,
  p_available_qty INT DEFAULT NULL,
  p_reserved_qty INT DEFAULT NULL,
  p_damaged_qty INT DEFAULT NULL,
  p_in_laundry_qty INT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.dressing_room_product_variants
  SET 
    total_quantity = COALESCE(p_total_qty, total_quantity),
    available_quantity = COALESCE(p_available_qty, available_quantity),
    reserved_quantity = COALESCE(p_reserved_qty, reserved_quantity),
    damaged_quantity = COALESCE(p_damaged_qty, damaged_quantity),
    in_laundry_quantity = COALESCE(p_in_laundry_qty, in_laundry_quantity),
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_variant_id;

  SELECT jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'message', 'Inventory updated'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_dressing_room_variant_inventory(BIGINT, INT, INT, INT, INT, INT)
TO authenticated;

-- ============================================
-- 15. RPC: Get Dressing Room Inventory Summary
-- ============================================
CREATE OR REPLACE FUNCTION public.get_dressing_room_inventory_summary()
RETURNS TABLE (
  product_id BIGINT,
  product_name TEXT,
  variant_id BIGINT,
  variant_name TEXT,
  sku TEXT,
  total_quantity INT,
  available_quantity INT,
  reserved_quantity INT,
  damaged_quantity INT,
  in_laundry_quantity INT,
  price INT,
  deposit_amount INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    drp.id,
    drp.name,
    drpv.id,
    drpv.name,
    drpv.sku,
    drpv.total_quantity,
    drpv.available_quantity,
    drpv.reserved_quantity,
    drpv.damaged_quantity,
    drpv.in_laundry_quantity,
    drpv.price,
    drpv.deposit_amount
  FROM public.dressing_room_products drp
  JOIN public.dressing_room_product_variants drpv ON drp.id = drpv.dressing_room_product_id
  WHERE drp.is_active = true AND drp.is_deleted = false
    AND drpv.is_active = true AND drpv.is_deleted = false
  ORDER BY drp.name, drpv.name;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_dressing_room_inventory_summary()
TO authenticated;
