-- ============================================
-- Migration: Add Update & Delete Functions for Stock Management
-- Date: 2026-06-09
-- Description: Add RPC functions for updating and deleting stock openings, adjustments, and opnames
-- ============================================

-- ============================================
-- 1. UPDATE STOCK OPENING
-- ============================================
CREATE OR REPLACE FUNCTION public.update_stock_opening(
  p_opening_id BIGINT,
  p_opening_date DATE,
  p_location TEXT,
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening record;
  v_item jsonb;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to update stock opening';
  END IF;

  -- Check if opening exists and is draft
  SELECT * INTO v_opening
  FROM public.stock_openings
  WHERE id = p_opening_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock opening not found';
  END IF;

  IF v_opening.status = 'confirmed' THEN
    RAISE EXCEPTION 'Cannot edit confirmed stock opening';
  END IF;

  -- Update stock opening header
  UPDATE public.stock_openings
  SET 
    opening_date = p_opening_date,
    location = p_location,
    notes = p_notes,
    updated_at = now()
  WHERE id = p_opening_id;

  -- Delete existing items
  DELETE FROM public.stock_opening_items
  WHERE stock_opening_id = p_opening_id;

  -- Insert new items
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
      p_opening_id,
      (v_item->>'product_id')::bigint,
      (v_item->>'variant_id')::bigint,
      (v_item->>'opening_quantity')::integer,
      COALESCE(v_item->>'unit', 'pcs'),
      v_item->>'notes'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'opening_id', p_opening_id,
    'opening_number', v_opening.opening_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_stock_opening(BIGINT, DATE, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- ============================================
-- 2. DELETE STOCK OPENING
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_stock_opening(
  p_opening_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opening record;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to delete stock opening';
  END IF;

  -- Check if opening exists
  SELECT * INTO v_opening
  FROM public.stock_openings
  WHERE id = p_opening_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock opening not found';
  END IF;

  -- Check if used in opname
  IF EXISTS (
    SELECT 1 FROM public.stock_opname_items soi
    JOIN public.stock_opnames so ON so.id = soi.stock_opname_id
    WHERE so.opname_date = v_opening.opening_date
      AND so.location = v_opening.location
  ) THEN
    RAISE EXCEPTION 'Cannot delete: Stock opening is used in stock opname';
  END IF;

  -- Delete items first (cascade will handle this, but explicit for clarity)
  DELETE FROM public.stock_opening_items
  WHERE stock_opening_id = p_opening_id;

  -- Delete opening
  DELETE FROM public.stock_openings
  WHERE id = p_opening_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_opening_id,
    'opening_number', v_opening.opening_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_stock_opening(BIGINT) TO authenticated, service_role;

-- ============================================
-- 3. UPDATE STOCK ADJUSTMENT
-- ============================================
CREATE OR REPLACE FUNCTION public.update_stock_adjustment(
  p_adjustment_id BIGINT,
  p_adjustment_date DATE,
  p_adjustment_type TEXT,
  p_reason TEXT,
  p_notes TEXT DEFAULT NULL,
  p_location TEXT DEFAULT 'SparkStage55',
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment record;
  v_item jsonb;
  v_old_item record;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to update stock adjustment';
  END IF;

  -- Validate adjustment type
  IF p_adjustment_type NOT IN ('gift', 'kol', 'loss', 'gain', 'other') THEN
    RAISE EXCEPTION 'Invalid adjustment type';
  END IF;

  -- Check if adjustment exists
  SELECT * INTO v_adjustment
  FROM public.stock_adjustments
  WHERE id = p_adjustment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock adjustment not found';
  END IF;

  -- Revert old stock changes
  FOR v_old_item IN 
    SELECT * FROM public.stock_adjustment_items
    WHERE stock_adjustment_id = p_adjustment_id
  LOOP
    UPDATE public.product_variants
    SET stock = stock - v_old_item.quantity_change
    WHERE id = v_old_item.variant_id;
  END LOOP;

  -- Update adjustment header
  UPDATE public.stock_adjustments
  SET 
    adjustment_date = p_adjustment_date,
    adjustment_type = p_adjustment_type,
    reason = p_reason,
    notes = p_notes,
    location = p_location,
    updated_at = now()
  WHERE id = p_adjustment_id;

  -- Delete old items
  DELETE FROM public.stock_adjustment_items
  WHERE stock_adjustment_id = p_adjustment_id;

  -- Insert new items and update stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.stock_adjustment_items (
      stock_adjustment_id,
      product_id,
      variant_id,
      quantity_change,
      unit,
      notes
    ) VALUES (
      p_adjustment_id,
      (v_item->>'product_id')::bigint,
      (v_item->>'variant_id')::bigint,
      (v_item->>'quantity_change')::integer,
      COALESCE(v_item->>'unit', 'pcs'),
      v_item->>'notes'
    );

    -- Update product_variants stock
    UPDATE public.product_variants
    SET stock = stock + (v_item->>'quantity_change')::integer
    WHERE id = (v_item->>'variant_id')::bigint;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'adjustment_id', p_adjustment_id,
    'adjustment_number', v_adjustment.adjustment_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_stock_adjustment(BIGINT, DATE, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;

-- ============================================
-- 4. DELETE STOCK ADJUSTMENT
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_stock_adjustment(
  p_adjustment_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment record;
  v_item record;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to delete stock adjustment';
  END IF;

  -- Check if adjustment exists
  SELECT * INTO v_adjustment
  FROM public.stock_adjustments
  WHERE id = p_adjustment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock adjustment not found';
  END IF;

  -- Revert stock changes
  FOR v_item IN 
    SELECT * FROM public.stock_adjustment_items
    WHERE stock_adjustment_id = p_adjustment_id
  LOOP
    UPDATE public.product_variants
    SET stock = stock - v_item.quantity_change
    WHERE id = v_item.variant_id;
  END LOOP;

  -- Delete items
  DELETE FROM public.stock_adjustment_items
  WHERE stock_adjustment_id = p_adjustment_id;

  -- Delete adjustment
  DELETE FROM public.stock_adjustments
  WHERE id = p_adjustment_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_adjustment_id,
    'adjustment_number', v_adjustment.adjustment_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_stock_adjustment(BIGINT) TO authenticated, service_role;

-- ============================================
-- 5. DELETE STOCK OPNAME
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_stock_opname(
  p_opname_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname record;
BEGIN
  -- Authorization check
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to delete stock opname';
  END IF;

  -- Check if opname exists
  SELECT * INTO v_opname
  FROM public.stock_opnames
  WHERE id = p_opname_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock opname not found';
  END IF;

  -- Delete items first
  DELETE FROM public.stock_opname_items
  WHERE stock_opname_id = p_opname_id;

  -- Delete opname
  DELETE FROM public.stock_opnames
  WHERE id = p_opname_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_id', p_opname_id,
    'opname_number', v_opname.opname_number
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_stock_opname(BIGINT) TO authenticated, service_role;

-- ============================================
-- Comments
-- ============================================
COMMENT ON FUNCTION public.update_stock_opening IS 'Update stock opening (draft only). Updates header and replaces all items.';
COMMENT ON FUNCTION public.delete_stock_opening IS 'Delete stock opening. Checks if used in opname first.';
COMMENT ON FUNCTION public.update_stock_adjustment IS 'Update stock adjustment. Reverts old changes and applies new ones to product_variants.stock.';
COMMENT ON FUNCTION public.delete_stock_adjustment IS 'Delete stock adjustment. Reverts stock changes to product_variants.';
COMMENT ON FUNCTION public.delete_stock_opname IS 'Delete stock opname and its items.';

-- Reload schema
NOTIFY pgrst, 'reload schema';
