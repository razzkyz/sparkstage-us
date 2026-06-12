-- Fix: Correct get_stock_opname_list and get_stock_opname_detail RPC functions
-- Issue: GROUP BY clause missing when using jsonb_agg

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
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to view stock opname';
  END IF;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM public.stock_opname;

  -- Build result with paginated data
  SELECT jsonb_build_object(
    'data', COALESCE(
      (
        SELECT jsonb_agg(
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
        )
        FROM public.stock_opname so
        LEFT JOIN auth.users u ON so.created_by = u.id
        ORDER BY so.transaction_date DESC, so.id DESC
        LIMIT p_limit
        OFFSET p_offset
      ),
      '[]'::jsonb
    ),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

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
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Not authorized to view stock opname detail';
  END IF;

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_stock_opname_list(INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_stock_opname_detail(BIGINT) TO authenticated, service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
