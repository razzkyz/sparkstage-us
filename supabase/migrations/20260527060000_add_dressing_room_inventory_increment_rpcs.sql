-- ============================================
-- Increment Available Quantity for DR Variant
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_dr_variant_available(
  p_variant_id BIGINT,
  p_qty INT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.dressing_room_product_variants
  SET 
    available_quantity = available_quantity + p_qty,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_variant_id;

  SELECT jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'message', 'Available quantity incremented'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_dr_variant_available(BIGINT, INT)
TO authenticated;

-- ============================================
-- Increment In Laundry Quantity for DR Variant
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_dr_variant_laundry(
  p_variant_id BIGINT,
  p_qty INT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.dressing_room_product_variants
  SET 
    in_laundry_quantity = in_laundry_quantity + p_qty,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_variant_id;

  SELECT jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'message', 'In laundry quantity incremented'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_dr_variant_laundry(BIGINT, INT)
TO authenticated;

-- ============================================
-- Increment Damaged Quantity for DR Variant
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_dr_variant_damaged(
  p_variant_id BIGINT,
  p_qty INT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE public.dressing_room_product_variants
  SET 
    damaged_quantity = damaged_quantity + p_qty,
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE id = p_variant_id;

  SELECT jsonb_build_object(
    'success', true,
    'variant_id', p_variant_id,
    'message', 'Damaged quantity incremented'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_dr_variant_damaged(BIGINT, INT)
TO authenticated;
