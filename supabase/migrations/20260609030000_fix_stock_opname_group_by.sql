-- ============================================
-- Migration: Fix Stock Opname GROUP BY Error
-- Date: 2026-06-09
-- Description: Fix "must appear in the GROUP BY clause" error in get_stock_opname_list
-- ============================================

-- ============================================
-- Fix: Get Stock Opname List
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
  WITH opname_data AS (
    SELECT 
      so.id,
      so.opname_number,
      so.opname_date,
      so.location,
      so.notes,
      so.status,
      so.created_by,
      u.email AS created_by_email,
      so.created_at,
      so.updated_at,
      (
        SELECT COUNT(*)
        FROM public.stock_opname_items soi
        WHERE soi.stock_opname_id = so.id
      ) AS items_count,
      (
        SELECT COUNT(*)
        FROM public.stock_opname_items soi
        WHERE soi.stock_opname_id = so.id
          AND soi.variance != 0
      ) AS variance_count
    FROM public.stock_opnames so
    LEFT JOIN auth.users u ON so.created_by = u.id
    ORDER BY so.opname_date DESC, so.id DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'data', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', od.id,
          'opname_number', od.opname_number,
          'opname_date', od.opname_date,
          'location', od.location,
          'notes', od.notes,
          'status', od.status,
          'created_by', od.created_by,
          'created_by_email', od.created_by_email,
          'created_at', od.created_at,
          'updated_at', od.updated_at,
          'items_count', od.items_count,
          'variance_count', od.variance_count
        )
      ),
      '[]'::jsonb
    ),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result
  FROM opname_data od;

  RETURN v_result;
END;
$$;

-- ============================================
-- Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.get_stock_opname_list(INTEGER, INTEGER) TO authenticated, service_role;

-- ============================================
-- Fix: Get Stock Opening List (preventive)
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
  WITH opening_data AS (
    SELECT 
      so.id,
      so.opening_number,
      so.opening_date,
      so.location,
      so.notes,
      so.status,
      so.created_by,
      u.email AS created_by_email,
      so.created_at,
      so.updated_at,
      (
        SELECT COUNT(*)
        FROM public.stock_opening_items soi
        WHERE soi.stock_opening_id = so.id
      ) AS items_count
    FROM public.stock_openings so
    LEFT JOIN auth.users u ON so.created_by = u.id
    ORDER BY so.opening_date DESC, so.id DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'data', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', od.id,
          'opening_number', od.opening_number,
          'opening_date', od.opening_date,
          'location', od.location,
          'notes', od.notes,
          'status', od.status,
          'created_by', od.created_by,
          'created_by_email', od.created_by_email,
          'created_at', od.created_at,
          'updated_at', od.updated_at,
          'items_count', od.items_count
        )
      ),
      '[]'::jsonb
    ),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result
  FROM opening_data od;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_opening_list(INTEGER, INTEGER) TO authenticated, service_role;

-- ============================================
-- Fix: Get Stock Adjustment List (preventive)
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
  WITH adjustment_data AS (
    SELECT 
      sa.id,
      sa.adjustment_number,
      sa.adjustment_date,
      sa.adjustment_type,
      sa.reason,
      sa.notes,
      sa.location,
      sa.created_by,
      u.email AS created_by_email,
      sa.created_at,
      sa.updated_at,
      (
        SELECT COUNT(*)
        FROM public.stock_adjustment_items sai
        WHERE sai.stock_adjustment_id = sa.id
      ) AS items_count
    FROM public.stock_adjustments sa
    LEFT JOIN auth.users u ON sa.created_by = u.id
    ORDER BY sa.adjustment_date DESC, sa.id DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT jsonb_build_object(
    'data', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ad.id,
          'adjustment_number', ad.adjustment_number,
          'adjustment_date', ad.adjustment_date,
          'adjustment_type', ad.adjustment_type,
          'reason', ad.reason,
          'notes', ad.notes,
          'location', ad.location,
          'created_by', ad.created_by,
          'created_by_email', ad.created_by_email,
          'created_at', ad.created_at,
          'updated_at', ad.updated_at,
          'items_count', ad.items_count
        )
      ),
      '[]'::jsonb
    ),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  )
  INTO v_result
  FROM adjustment_data ad;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stock_adjustment_list(INTEGER, INTEGER) TO authenticated, service_role;

-- Reload schema
NOTIFY pgrst, 'reload schema';
