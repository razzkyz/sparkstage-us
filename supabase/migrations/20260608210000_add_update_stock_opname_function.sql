-- Add update stock opname function for admin/devops to edit stock opname records
-- This allows editing of reason, notes, and transaction details

-- ============================================
-- 1. RPC: Update Stock Opname
-- ============================================
CREATE OR REPLACE FUNCTION public.update_stock_opname(
  p_opname_id BIGINT,
  p_reason TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Authorization check: only admin or service_role can update
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to update stock opname';
  END IF;

  -- Update stock opname header
  UPDATE public.stock_opname
  SET
    reason = COALESCE(p_reason, reason),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_opname_id;

  -- Return updated record
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Stock opname berhasil diperbarui'
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_stock_opname(BIGINT, TEXT, TEXT) TO authenticated, service_role;

-- Add comment
COMMENT ON FUNCTION public.update_stock_opname IS 'Update stock opname reason and notes';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
