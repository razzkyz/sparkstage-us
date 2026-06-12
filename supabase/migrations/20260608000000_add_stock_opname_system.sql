-- ============================================
-- Migration: Stock Opname System
-- Date: 2026-06-08
-- Description: Add stock opname (stock taking) system for inventory management
-- ============================================

-- ============================================
-- 1. Stock Opname Table (Header)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_opname (
  id BIGSERIAL PRIMARY KEY,
  opname_number TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL DEFAULT 'SparkStage55',
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('stock_in', 'stock_out', 'adjustment')),
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_opname_created_by ON public.stock_opname(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_opname_transaction_date ON public.stock_opname(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_opname_transaction_type ON public.stock_opname(transaction_type);

-- ============================================
-- 2. Stock Opname Items Table (Detail)
-- ============================================
CREATE TABLE IF NOT EXISTS public.stock_opname_items (
  id BIGSERIAL PRIMARY KEY,
  stock_opname_id BIGINT NOT NULL REFERENCES public.stock_opname(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity_before INTEGER NOT NULL DEFAULT 0,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_per_unit NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_opname_id ON public.stock_opname_items(stock_opname_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_product_id ON public.stock_opname_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_items_variant_id ON public.stock_opname_items(variant_id);

-- ============================================
-- 3. Auto-generate Stock Opname Number
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_stock_opname_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_number INTEGER;
  v_new_number TEXT;
BEGIN
  -- Get the last number from existing opname records
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN opname_number ~ '^#sop-[0-9]+$' 
        THEN SUBSTRING(opname_number FROM 6)::INTEGER
        ELSE 0
      END
    ),
    0
  )
  INTO v_last_number
  FROM public.stock_opname;

  -- Generate new number with padding
  v_new_number := '#sop-' || LPAD((v_last_number + 1)::TEXT, 5, '0');
  
  RETURN v_new_number;
END;
$$;

-- ============================================
-- 4. Trigger to auto-generate opname_number
-- ============================================
CREATE OR REPLACE FUNCTION public.set_stock_opname_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.opname_number IS NULL OR NEW.opname_number = '' THEN
    NEW.opname_number := public.generate_stock_opname_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_stock_opname_number
  BEFORE INSERT ON public.stock_opname
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stock_opname_number();

-- ============================================
-- 5. RPC: Create Stock Opname with Items
-- ============================================
CREATE OR REPLACE FUNCTION public.create_stock_opname(
  p_location TEXT,
  p_transaction_date TIMESTAMPTZ,
  p_transaction_type TEXT,
  p_reason TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname_id BIGINT;
  v_opname_number TEXT;
  v_item JSONB;
  v_variant_id BIGINT;
  v_product_id BIGINT;
  v_quantity_before INTEGER;
  v_quantity_change INTEGER;
  v_quantity_after INTEGER;
  v_items_processed INTEGER := 0;
BEGIN
  -- Authorization check: only admin or kasir can create stock opname
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to create stock opname';
  END IF;

  -- Validate transaction type
  IF p_transaction_type NOT IN ('stock_in', 'stock_out', 'adjustment') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
  END IF;

  -- Validate items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Stock opname must have at least one item';
  END IF;

  -- Create stock opname header
  INSERT INTO public.stock_opname (
    location,
    transaction_date,
    transaction_type,
    reason,
    notes,
    created_by
  ) VALUES (
    COALESCE(p_location, 'SparkStage55'),
    COALESCE(p_transaction_date, NOW()),
    p_transaction_type,
    p_reason,
    p_notes,
    auth.uid()
  )
  RETURNING id, opname_number INTO v_opname_id, v_opname_number;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::BIGINT;
    v_quantity_change := (v_item->>'quantity_change')::INTEGER;

    IF v_variant_id IS NULL OR v_quantity_change IS NULL THEN
      RAISE EXCEPTION 'Invalid item data: variant_id and quantity_change are required';
    END IF;

    -- Get current stock and product_id
    SELECT product_id, stock
    INTO v_product_id, v_quantity_before
    FROM public.product_variants
    WHERE id = v_variant_id
      AND is_active = TRUE;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Product variant % not found or inactive', v_variant_id;
    END IF;

    -- Calculate new stock
    v_quantity_after := v_quantity_before + v_quantity_change;

    IF v_quantity_after < 0 THEN
      RAISE EXCEPTION 'Stock cannot be negative. Current: %, Change: %', v_quantity_before, v_quantity_change;
    END IF;

    -- Insert stock opname item
    INSERT INTO public.stock_opname_items (
      stock_opname_id,
      product_id,
      variant_id,
      quantity_before,
      quantity_change,
      quantity_after,
      unit,
      cost_per_unit
    ) VALUES (
      v_opname_id,
      v_product_id,
      v_variant_id,
      v_quantity_before,
      v_quantity_change,
      v_quantity_after,
      COALESCE(v_item->>'unit', 'pcs'),
      (v_item->>'cost_per_unit')::NUMERIC
    );

    -- Update product variant stock
    UPDATE public.product_variants
    SET 
      stock = v_quantity_after,
      updated_at = NOW()
    WHERE id = v_variant_id;

    v_items_processed := v_items_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'opname_id', v_opname_id,
    'opname_number', v_opname_number,
    'items_processed', v_items_processed
  );
END;
$$;

-- ============================================
-- 6. RPC: Get Stock Opname List
-- ============================================
CREATE OR REPLACE FUNCTION public.get_stock_opname_list(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_total_count INTEGER;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to view stock opname';
  END IF;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.stock_opname;

  -- Get stock opname list with user info
  SELECT jsonb_build_object(
    'data', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', so.id,
        'opname_number', so.opname_number,
        'location', so.location,
        'transaction_date', so.transaction_date,
        'transaction_type', so.transaction_type,
        'reason', so.reason,
        'notes', so.notes,
        'created_by', so.created_by,
        'created_by_email', u.email,
        'created_at', so.created_at,
        'items_count', (
          SELECT COUNT(*)
          FROM public.stock_opname_items soi
          WHERE soi.stock_opname_id = so.id
        )
      )
      ORDER BY so.transaction_date DESC, so.id DESC
    ), '[]'::jsonb),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result
  FROM public.stock_opname so
  LEFT JOIN auth.users u ON so.created_by = u.id
  ORDER BY so.transaction_date DESC, so.id DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN v_result;
END;
$$;

-- ============================================
-- 7. RPC: Get Stock Opname Detail
-- ============================================
CREATE OR REPLACE FUNCTION public.get_stock_opname_detail(
  p_opname_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to view stock opname detail';
  END IF;

  -- Get stock opname with items
  SELECT jsonb_build_object(
    'id', so.id,
    'opname_number', so.opname_number,
    'location', so.location,
    'transaction_date', so.transaction_date,
    'transaction_type', so.transaction_type,
    'reason', so.reason,
    'notes', so.notes,
    'created_by', so.created_by,
    'created_by_email', u.email,
    'created_at', so.created_at,
    'updated_at', so.updated_at,
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', soi.id,
          'product_id', soi.product_id,
          'product_name', p.name,
          'product_sku', p.sku,
          'variant_id', soi.variant_id,
          'variant_name', pv.name,
          'variant_sku', pv.sku,
          'quantity_before', soi.quantity_before,
          'quantity_change', soi.quantity_change,
          'quantity_after', soi.quantity_after,
          'unit', soi.unit,
          'cost_per_unit', soi.cost_per_unit
        )
        ORDER BY soi.id
      )
      FROM public.stock_opname_items soi
      LEFT JOIN public.products p ON soi.product_id = p.id
      LEFT JOIN public.product_variants pv ON soi.variant_id = pv.id
      WHERE soi.stock_opname_id = so.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.stock_opname so
  LEFT JOIN auth.users u ON so.created_by = u.id
  WHERE so.id = p_opname_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Stock opname % not found', p_opname_id;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 8. RLS Policies
-- ============================================
ALTER TABLE public.stock_opname ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_opname_items ENABLE ROW LEVEL SECURITY;

-- Admin can view all stock opname
CREATE POLICY "Admin can view stock opname"
  ON public.stock_opname
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin can create stock opname
CREATE POLICY "Admin can create stock opname"
  ON public.stock_opname
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admin can view stock opname items
CREATE POLICY "Admin can view stock opname items"
  ON public.stock_opname_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.stock_opname
      WHERE id = stock_opname_items.stock_opname_id
        AND public.is_admin()
    )
  );

-- Admin can create stock opname items
CREATE POLICY "Admin can create stock opname items"
  ON public.stock_opname_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.stock_opname
      WHERE id = stock_opname_items.stock_opname_id
        AND public.is_admin()
    )
  );

-- ============================================
-- 9. Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.generate_stock_opname_number() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_stock_opname(TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opname_list(INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opname_detail(BIGINT) TO authenticated, service_role;

-- ============================================
-- 10. Comments
-- ============================================
COMMENT ON TABLE public.stock_opname IS 'Stock opname (stock taking) header records';
COMMENT ON TABLE public.stock_opname_items IS 'Stock opname item details with quantity changes';
COMMENT ON FUNCTION public.create_stock_opname IS 'Create a new stock opname record with items and update product variant stock';
COMMENT ON FUNCTION public.get_stock_opname_list IS 'Get paginated list of stock opname records';
COMMENT ON FUNCTION public.get_stock_opname_detail IS 'Get detailed stock opname record with all items';
