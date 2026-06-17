-- Migration: Add Dressing Room Category and Dashboard Stats RPC
-- Date: 2026-05-20
-- Description:
--   - Ensure 'Dressing Room' category exists
--   - Create RPC function to get dressing room dashboard stats filtered by category
--   - This function returns collections, looks, rentals filtered by Dressing Room category

-- ============================================
-- 1. Ensure 'Dressing Room' category exists
-- ============================================

INSERT INTO public.categories (name, slug, is_active, created_at, updated_at)
VALUES ('Dressing Room', 'dressing-room', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. Create RPC function for dashboard stats
-- ============================================

CREATE OR REPLACE FUNCTION public.get_dressing_room_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dr_category_id BIGINT;
  v_total_collections INT;
  v_total_looks INT;
  v_result JSONB;
BEGIN
  -- Get Dressing Room category ID
  SELECT id INTO v_dr_category_id
  FROM public.categories
  WHERE slug = 'dressing-room'
  LIMIT 1;

  -- Count total ACTIVE collections that have looks with products in Dressing Room category
  WITH filtered_collections AS (
    SELECT DISTINCT drc.id
    FROM public.dressing_room_collections drc
    INNER JOIN public.dressing_room_looks drl ON drl.collection_id = drc.id
    INNER JOIN public.dressing_room_look_items drli ON drli.look_id = drl.id
    INNER JOIN public.product_variants pv ON pv.id = drli.product_variant_id
    INNER JOIN public.products p ON p.id = pv.product_id
    WHERE drc.is_active = true
      AND p.category_id = v_dr_category_id
  )
  SELECT COUNT(*) INTO v_total_collections
  FROM filtered_collections;

  -- Count total looks that have products in Dressing Room category
  WITH filtered_looks AS (
    SELECT DISTINCT drl.id
    FROM public.dressing_room_looks drl
    INNER JOIN public.dressing_room_look_items drli ON drli.look_id = drl.id
    INNER JOIN public.product_variants pv ON pv.id = drli.product_variant_id
    INNER JOIN public.products p ON p.id = pv.product_id
    WHERE p.category_id = v_dr_category_id
  )
  SELECT COUNT(*) INTO v_total_looks
  FROM filtered_looks;

  -- Build result JSON
  v_result := jsonb_build_object(
    'total_collections', COALESCE(v_total_collections, 0),
    'total_looks', COALESCE(v_total_looks, 0),
    'category_id', v_dr_category_id
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_dressing_room_dashboard_stats() IS
  'Returns dressing room dashboard stats (collections, looks) filtered by Dressing Room category. Returns JSON with total_collections, total_looks, and category_id.';
