-- ============================================
-- Add Finalize Stock Opname Function
-- Date: 2026-06-09
-- Description: Add function to finalize stock opname (change status from draft to finalized)
-- ============================================

CREATE OR REPLACE FUNCTION public.finalize_stock_opname(
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
    RAISE EXCEPTION 'Not authorized to finalize stock opname';
  END IF;

  -- Check if opname exists
  SELECT * INTO v_opname
  FROM public.stock_opnames
  WHERE id = p_opname_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock opname not found';
  END IF;

  -- Check if already finalized
  IF v_opname.status = 'finalized' THEN
    RAISE EXCEPTION 'Stock opname already finalized';
  END IF;

  -- Check if has items
  IF NOT EXISTS (
    SELECT 1 FROM public.stock_opname_items
    WHERE stock_opname_id = p_opname_id
  ) THEN
    RAISE EXCEPTION 'Cannot finalize opname without items';
  END IF;

  -- Check if all variance has reasons (when variance != 0)
  IF EXISTS (
    SELECT 1 FROM public.stock_opname_items
    WHERE stock_opname_id = p_opname_id
      AND variance != 0
      AND (variance_reason IS NULL OR variance_reason = '')
  ) THEN
    RAISE EXCEPTION 'Semua item dengan variance harus memiliki alasan';
  END IF;

  -- Update status to finalized
  UPDATE public.stock_opnames
  SET 
    status = 'finalized',
    updated_at = NOW()
  WHERE id = p_opname_id;

  -- Optional: Update product_variants.stock based on variance (reconciliation)
  -- This will adjust actual stock to match physical count
  UPDATE public.product_variants pv
  SET stock = stock + soi.variance
  FROM public.stock_opname_items soi
  WHERE soi.stock_opname_id = p_opname_id
    AND soi.variant_id = pv.id
    AND soi.variance != 0;

  RETURN jsonb_build_object(
    'success', true,
    'opname_id', p_opname_id,
    'opname_number', v_opname.opname_number,
    'status', 'finalized',
    'message', 'Stock opname berhasil di-finalize dan stock telah disesuaikan'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_stock_opname(BIGINT) TO authenticated, service_role;

COMMENT ON FUNCTION public.finalize_stock_opname IS 'Finalize stock opname. Changes status to finalized and reconciles actual stock based on variance.';
