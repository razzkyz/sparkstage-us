-- ============================================
-- Migration: Stock Opname RPC Functions
-- Date: 2026-06-09
-- Description: RPC functions for managing stock opening, adjustments, and opname
-- ============================================

-- ============================================
-- 1. Create Stock Opening
-- ============================================
CREATE OR REPLACE FUNCTION public.create_stock_opening(
  p_opening_date DATE,
  p_location TEXT,
  p_notes TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening_id BIGINT;
  v_opening_number TEXT;
  v_item JSONB;
  v_items_processed INTEGER := 0;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to create stock opening';
  END IF;

  -- Validate items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Stock opening must have at least one item';
  END IF;

  -- Check if opening already exists for this date and location
  IF EXISTS (
    SELECT 1 FROM public.stock_openings
    WHERE opening_date = p_opening_date
      AND location = COALESCE(p_location, 'SparkStage55')
  ) THEN
    RAISE EXCEPTION 'Stock opening already exists for date % at location %', p_opening_date, COALESCE(p_location, 'SparkStage55');
  END IF;

  -- Create stock opening
  INSERT INTO public.stock_openings (
    opening_date,
    location,
    notes,
    status,
    created_by
  ) VALUES (
    p_opening_date,
    COALESCE(p_location, 'SparkStage55'),
    p_notes,
    'draft',
    auth.uid()
  )
  RETURNING id, opening_number INTO v_opening_id, v_opening_number;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.stock_opening_items (
      stock_opening_id,
      product_id,
      variant_id,
      opening_quantity,
      unit,
      notes
    ) VALUES (
      v_opening_id,
      (v_item->>'product_id')::BIGINT,
      (v_item->>'variant_id')::BIGINT,
      (v_item->>'opening_quantity')::INTEGER,
      COALESCE(v_item->>'unit', 'pcs'),
      v_item->>'notes'
    );

    v_items_processed := v_items_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'opening_id', v_opening_id,
    'opening_number', v_opening_number,
    'items_processed', v_items_processed
  );
END;
$$;

-- ============================================
-- 2. Get Stock Opening List
-- ============================================
CREATE OR REPLACE FUNCTION public.get_stock_opening_list(
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
    RAISE EXCEPTION 'Not authorized to view stock openings';
  END IF;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.stock_openings;

  -- Get stock opening list
  SELECT jsonb_build_object(
    'data', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', so.id,
        'opening_number', so.opening_number,
        'opening_date', so.opening_date,
        'location', so.location,
        'notes', so.notes,
        'status', so.status,
        'created_by', so.created_by,
        'created_by_email', u.email,
        'created_at', so.created_at,
        'updated_at', so.updated_at,
        'items_count', (
          SELECT COUNT(*)
          FROM public.stock_opening_items soi
          WHERE soi.stock_opening_id = so.id
        )
      )
      ORDER BY so.opening_date DESC, so.id DESC
    ), '[]'::jsonb),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result
  FROM public.stock_openings so
  LEFT JOIN auth.users u ON so.created_by = u.id
  ORDER BY so.opening_date DESC, so.id DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN v_result;
END;
$$;

-- ============================================
-- 3. Get Stock Opening Detail
-- ============================================
CREATE OR REPLACE FUNCTION public.get_stock_opening_detail(
  p_opening_id BIGINT
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
    RAISE EXCEPTION 'Not authorized to view stock opening detail';
  END IF;

  -- Get stock opening with items
  SELECT jsonb_build_object(
    'id', so.id,
    'opening_number', so.opening_number,
    'opening_date', so.opening_date,
    'location', so.location,
    'notes', so.notes,
    'status', so.status,
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
          'opening_quantity', soi.opening_quantity,
          'unit', soi.unit,
          'notes', soi.notes
        )
        ORDER BY soi.id
      )
      FROM public.stock_opening_items soi
      LEFT JOIN public.products p ON soi.product_id = p.id
      LEFT JOIN public.product_variants pv ON soi.variant_id = pv.id
      WHERE soi.stock_opening_id = so.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.stock_openings so
  LEFT JOIN auth.users u ON so.created_by = u.id
  WHERE so.id = p_opening_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Stock opening % not found', p_opening_id;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 4. Create Stock Adjustment
-- ============================================
CREATE OR REPLACE FUNCTION public.create_stock_adjustment(
  p_adjustment_date DATE,
  p_adjustment_type TEXT,
  p_reason TEXT,
  p_notes TEXT,
  p_location TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_id BIGINT;
  v_adjustment_number TEXT;
  v_item JSONB;
  v_items_processed INTEGER := 0;
  v_variant_id BIGINT;
  v_quantity_change INTEGER;
  v_current_stock INTEGER;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to create stock adjustment';
  END IF;

  -- Validate adjustment type
  IF p_adjustment_type NOT IN ('gift', 'kol', 'loss', 'gain', 'other') THEN
    RAISE EXCEPTION 'Invalid adjustment type: %', p_adjustment_type;
  END IF;

  -- Validate items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Stock adjustment must have at least one item';
  END IF;

  -- Create stock adjustment
  INSERT INTO public.stock_adjustments (
    adjustment_date,
    adjustment_type,
    reason,
    notes,
    location,
    created_by
  ) VALUES (
    p_adjustment_date,
    p_adjustment_type,
    p_reason,
    p_notes,
    COALESCE(p_location, 'SparkStage55'),
    auth.uid()
  )
  RETURNING id, adjustment_number INTO v_adjustment_id, v_adjustment_number;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variant_id := (v_item->>'variant_id')::BIGINT;
    v_quantity_change := (v_item->>'quantity_change')::INTEGER;

    -- Get current stock
    SELECT stock INTO v_current_stock
    FROM public.product_variants
    WHERE id = v_variant_id;

    -- Validate negative adjustments don't go below zero
    IF (v_current_stock + v_quantity_change) < 0 THEN
      RAISE EXCEPTION 'Adjustment would make stock negative for variant %. Current: %, Change: %', 
        v_variant_id, v_current_stock, v_quantity_change;
    END IF;

    -- Insert adjustment item
    INSERT INTO public.stock_adjustment_items (
      stock_adjustment_id,
      product_id,
      variant_id,
      quantity_change,
      unit,
      notes
    ) VALUES (
      v_adjustment_id,
      (v_item->>'product_id')::BIGINT,
      v_variant_id,
      v_quantity_change,
      COALESCE(v_item->>'unit', 'pcs'),
      v_item->>'notes'
    );

    -- Update product variant stock
    UPDATE public.product_variants
    SET 
      stock = stock + v_quantity_change,
      updated_at = NOW()
    WHERE id = v_variant_id;

    v_items_processed := v_items_processed + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'adjustment_id', v_adjustment_id,
    'adjustment_number', v_adjustment_number,
    'items_processed', v_items_processed
  );
END;
$$;

-- ============================================
-- 5. Get Stock Adjustment List
-- ============================================
CREATE OR REPLACE FUNCTION public.get_stock_adjustment_list(
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
    RAISE EXCEPTION 'Not authorized to view stock adjustments';
  END IF;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.stock_adjustments;

  -- Get stock adjustment list
  SELECT jsonb_build_object(
    'data', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', sa.id,
        'adjustment_number', sa.adjustment_number,
        'adjustment_date', sa.adjustment_date,
        'adjustment_type', sa.adjustment_type,
        'reason', sa.reason,
        'notes', sa.notes,
        'location', sa.location,
        'created_by', sa.created_by,
        'created_by_email', u.email,
        'created_at', sa.created_at,
        'updated_at', sa.updated_at,
        'items_count', (
          SELECT COUNT(*)
          FROM public.stock_adjustment_items sai
          WHERE sai.stock_adjustment_id = sa.id
        )
      )
      ORDER BY sa.adjustment_date DESC, sa.id DESC
    ), '[]'::jsonb),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result
  FROM public.stock_adjustments sa
  LEFT JOIN auth.users u ON sa.created_by = u.id
  ORDER BY sa.adjustment_date DESC, sa.id DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN v_result;
END;
$$;

-- ============================================
-- 6. Calculate System Stock (for Stock Opname)
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_system_stock_for_opname(
  p_opname_date DATE,
  p_location TEXT DEFAULT 'SparkStage55'
)
RETURNS TABLE (
  variant_id BIGINT,
  product_id BIGINT,
  product_name TEXT,
  variant_name TEXT,
  variant_sku TEXT,
  opening_stock INTEGER,
  sold_quantity INTEGER,
  adjustment_quantity INTEGER,
  system_stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH opening_stocks AS (
    SELECT 
      soi.variant_id,
      soi.product_id,
      soi.opening_quantity
    FROM public.stock_opening_items soi
    JOIN public.stock_openings so ON so.id = soi.stock_opening_id
    WHERE so.opening_date = p_opname_date
      AND so.location = p_location
      AND so.status = 'confirmed'
  ),
  sales AS (
    SELECT 
      opi.product_variant_id AS variant_id,
      SUM(opi.quantity) AS sold_qty
    FROM public.order_product_items opi
    JOIN public.order_products op ON op.id = opi.order_product_id
    WHERE DATE(op.created_at) = p_opname_date
      AND op.payment_status = 'paid'
      AND op.pickup_status IN ('pending', 'ready', 'completed')
    GROUP BY opi.product_variant_id
  ),
  adjustments AS (
    SELECT 
      sai.variant_id,
      SUM(sai.quantity_change) AS adj_qty
    FROM public.stock_adjustment_items sai
    JOIN public.stock_adjustments sa ON sa.id = sai.stock_adjustment_id
    WHERE sa.adjustment_date = p_opname_date
      AND sa.location = p_location
    GROUP BY sai.variant_id
  )
  SELECT 
    os.variant_id,
    os.product_id,
    p.name AS product_name,
    pv.name AS variant_name,
    pv.sku AS variant_sku,
    COALESCE(os.opening_quantity, 0) AS opening_stock,
    COALESCE(s.sold_qty, 0)::INTEGER AS sold_quantity,
    COALESCE(a.adj_qty, 0)::INTEGER AS adjustment_quantity,
    (COALESCE(os.opening_quantity, 0) - COALESCE(s.sold_qty, 0) + COALESCE(a.adj_qty, 0))::INTEGER AS system_stock
  FROM opening_stocks os
  LEFT JOIN sales s ON s.variant_id = os.variant_id
  LEFT JOIN adjustments a ON a.variant_id = os.variant_id
  LEFT JOIN public.products p ON p.id = os.product_id
  LEFT JOIN public.product_variants pv ON pv.id = os.variant_id
  ORDER BY p.name, pv.name;
END;
$$;

-- ============================================
-- 7. Create Stock Opname
-- ============================================
CREATE OR REPLACE FUNCTION public.create_stock_opname(
  p_opname_date DATE,
  p_location TEXT,
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
  v_items_processed INTEGER := 0;
  v_variance INTEGER;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to create stock opname';
  END IF;

  -- Validate items
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Stock opname must have at least one item';
  END IF;

  -- Check if opname already exists for this date and location
  IF EXISTS (
    SELECT 1 FROM public.stock_opnames
    WHERE opname_date = p_opname_date
      AND location = COALESCE(p_location, 'SparkStage55')
  ) THEN
    RAISE EXCEPTION 'Stock opname already exists for date % at location %', p_opname_date, COALESCE(p_location, 'SparkStage55');
  END IF;

  -- Create stock opname
  INSERT INTO public.stock_opnames (
    opname_date,
    location,
    notes,
    status,
    created_by
  ) VALUES (
    p_opname_date,
    COALESCE(p_location, 'SparkStage55'),
    p_notes,
    'draft',
    auth.uid()
  )
  RETURNING id, opname_number INTO v_opname_id, v_opname_number;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_variance := (v_item->>'physical_count')::INTEGER - (v_item->>'system_stock')::INTEGER;

    INSERT INTO public.stock_opname_items (
      stock_opname_id,
      product_id,
      variant_id,
      opening_stock,
      sold_quantity,
      adjustment_quantity,
      system_stock,
      physical_count,
      variance,
      variance_reason,
      unit,
      notes
    ) VALUES (
      v_opname_id,
      (v_item->>'product_id')::BIGINT,
      (v_item->>'variant_id')::BIGINT,
      (v_item->>'opening_stock')::INTEGER,
      (v_item->>'sold_quantity')::INTEGER,
      (v_item->>'adjustment_quantity')::INTEGER,
      (v_item->>'system_stock')::INTEGER,
      (v_item->>'physical_count')::INTEGER,
      v_variance,
      v_item->>'variance_reason',
      COALESCE(v_item->>'unit', 'pcs'),
      v_item->>'notes'
    );

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
-- 8. Get Stock Opname List
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
    RAISE EXCEPTION 'Not authorized to view stock opnames';
  END IF;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.stock_opnames;

  -- Get stock opname list
  SELECT jsonb_build_object(
    'data', COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', so.id,
        'opname_number', so.opname_number,
        'opname_date', so.opname_date,
        'location', so.location,
        'notes', so.notes,
        'status', so.status,
        'created_by', so.created_by,
        'created_by_email', u.email,
        'created_at', so.created_at,
        'updated_at', so.updated_at,
        'items_count', (
          SELECT COUNT(*)
          FROM public.stock_opname_items soi
          WHERE soi.stock_opname_id = so.id
        ),
        'variance_count', (
          SELECT COUNT(*)
          FROM public.stock_opname_items soi
          WHERE soi.stock_opname_id = so.id
            AND soi.variance != 0
        )
      )
      ORDER BY so.opname_date DESC, so.id DESC
    ), '[]'::jsonb),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result
  FROM public.stock_opnames so
  LEFT JOIN auth.users u ON so.created_by = u.id
  ORDER BY so.opname_date DESC, so.id DESC
  LIMIT p_limit
  OFFSET p_offset;

  RETURN v_result;
END;
$$;

-- ============================================
-- 9. Get Stock Opname Detail
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
    'opname_date', so.opname_date,
    'location', so.location,
    'notes', so.notes,
    'status', so.status,
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
          'opening_stock', soi.opening_stock,
          'sold_quantity', soi.sold_quantity,
          'adjustment_quantity', soi.adjustment_quantity,
          'system_stock', soi.system_stock,
          'physical_count', soi.physical_count,
          'variance', soi.variance,
          'variance_reason', soi.variance_reason,
          'unit', soi.unit,
          'notes', soi.notes
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
  FROM public.stock_opnames so
  LEFT JOIN auth.users u ON so.created_by = u.id
  WHERE so.id = p_opname_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Stock opname % not found', p_opname_id;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================
-- 10. Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.create_stock_opening(DATE, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opening_list(INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opening_detail(BIGINT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_stock_adjustment(DATE, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_adjustment_list(INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_system_stock_for_opname(DATE, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_stock_opname(DATE, TEXT, TEXT, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opname_list(INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opname_detail(BIGINT) TO authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
