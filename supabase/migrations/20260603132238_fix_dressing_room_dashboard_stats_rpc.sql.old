-- ============================================================
-- Migration: Fix Dressing Room Dashboard Stats RPC
-- Date: 2026-06-03
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_dressing_room_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_collections INT;
  v_total_looks INT;
  v_result JSONB;
BEGIN

  -- In the new dressing room system, we count active products and variants
  -- since 'collections' and 'looks' are deprecated for the new dressing_room_products table
  SELECT COUNT(*) INTO v_total_collections
  FROM public.dressing_room_products
  WHERE is_active = true AND is_deleted = false;

  SELECT COUNT(*) INTO v_total_looks
  FROM public.dressing_room_product_variants
  WHERE is_active = true AND is_deleted = false;

  -- Build result JSON
  v_result := jsonb_build_object(
    'total_collections', COALESCE(v_total_collections, 0),
    'total_looks', COALESCE(v_total_looks, 0)
  );

  RETURN v_result;
END;
$$;
