-- Add delete stock opname function

CREATE OR REPLACE FUNCTION public.delete_stock_opname(
  p_opname_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opname_number TEXT;
  v_items_count INTEGER;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to delete stock opname';
  END IF;

  -- Get opname number before deletion
  SELECT opname_number, COUNT(soi.id)
  INTO v_opname_number, v_items_count
  FROM public.stock_opname so
  LEFT JOIN public.stock_opname_items soi ON so.id = soi.stock_opname_id
  WHERE so.id = p_opname_id
  GROUP BY so.id;

  IF v_opname_number IS NULL THEN
    RAISE EXCEPTION 'Stock opname % not found', p_opname_id;
  END IF;

  -- Reverse the stock changes by updating variants back to their original quantities
  -- For each item in this opname, we subtract the quantity_change to revert it
  UPDATE public.product_variants pv
  SET 
    stock = stock - soi.quantity_change,
    updated_at = NOW()
  FROM public.stock_opname_items soi
  WHERE soi.stock_opname_id = p_opname_id
    AND pv.id = soi.variant_id;

  -- Delete stock opname items
  DELETE FROM public.stock_opname_items
  WHERE stock_opname_id = p_opname_id;

  -- Delete stock opname header
  DELETE FROM public.stock_opname
  WHERE id = p_opname_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'opname_number', v_opname_number,
    'items_deleted', v_items_count,
    'message', 'Stock opname ' || v_opname_number || ' berhasil dihapus'
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_stock_opname(BIGINT) TO authenticated, service_role;

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
