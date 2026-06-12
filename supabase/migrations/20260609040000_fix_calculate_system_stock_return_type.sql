-- Fix: Returned type mismatch for calculate_system_stock_for_opname
-- Error: "Returned type character varying(255) does not match expected type text"
-- Solution: Cast VARCHAR columns to TEXT explicitly

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
    p.name::TEXT AS product_name,           -- Cast to TEXT
    pv.name::TEXT AS variant_name,          -- Cast to TEXT
    COALESCE(pv.sku, '')::TEXT AS variant_sku,  -- Cast to TEXT with fallback
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_system_stock_for_opname(DATE, TEXT) TO authenticated, service_role;

-- Comment
COMMENT ON FUNCTION public.calculate_system_stock_for_opname IS 
'Calculate system stock for stock opname by combining opening stock, sales, and adjustments. 
Fixed return type casting for VARCHAR columns.';
