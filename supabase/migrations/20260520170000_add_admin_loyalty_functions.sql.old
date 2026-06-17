-- ============================================
-- Migration: Add Admin Loyalty Point Functions
-- Date: 2026-05-20
-- Description: Functions for admin to award/deduct loyalty points
-- ============================================

-- Function to award admin bonus points
CREATE OR REPLACE FUNCTION public.award_admin_bonus(
  p_user_id UUID,
  p_points BIGINT,
  p_reason TEXT DEFAULT 'Admin bonus award'
)
RETURNS TABLE(
  success BOOLEAN,
  total_points BIGINT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total BIGINT;
  v_new_tier SMALLINT;
BEGIN
  IF p_user_id IS NULL OR p_points < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  -- Check if calling user is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_role_assignments.user_id = auth.uid()
    AND user_role_assignments.role_name IN ('super_admin', 'admin')
  ) THEN
    RETURN QUERY SELECT false, 0::BIGINT, 'Access denied'::TEXT;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.customer_loyalty_points (user_id, total_points, tier_level)
    VALUES (p_user_id, p_points, public.get_tier_level(p_points))
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_points = customer_loyalty_points.total_points + p_points,
      tier_level = GREATEST(
        customer_loyalty_points.tier_level,
        public.get_tier_level(customer_loyalty_points.total_points + p_points)
      ),
      updated_at = NOW()
    RETURNING total_points, tier_level INTO v_new_total, v_new_tier;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0::BIGINT, ('Error updating loyalty points: ' || SQLERRM)::TEXT;
    RETURN;
  END;

  BEGIN
    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id)
    VALUES (p_user_id, p_points, p_reason, NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  RETURN QUERY SELECT
    true,
    v_new_total,
    ('Successfully awarded ' || p_points::TEXT || ' points')::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_admin_bonus(UUID, BIGINT, TEXT) TO authenticated;

-- Function to deduct admin points
CREATE OR REPLACE FUNCTION public.deduct_admin_points(
  p_user_id UUID,
  p_points BIGINT,
  p_reason TEXT DEFAULT 'Admin deduction'
)
RETURNS TABLE(
  success BOOLEAN,
  remaining_points BIGINT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points BIGINT;
  v_remaining BIGINT;
BEGIN
  IF p_user_id IS NULL OR p_points < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  -- Check if calling user is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_role_assignments
    WHERE user_role_assignments.user_id = auth.uid()
    AND user_role_assignments.role_name IN ('super_admin', 'admin')
  ) THEN
    RETURN QUERY SELECT false, 0::BIGINT, 'Access denied'::TEXT;
    RETURN;
  END IF;

  -- Get current balance
  SELECT total_points INTO v_current_points
  FROM public.customer_loyalty_points
  WHERE user_id = p_user_id;

  IF v_current_points IS NULL OR v_current_points < p_points THEN
    RETURN QUERY SELECT false, COALESCE(v_current_points, 0)::BIGINT, 'Insufficient points'::TEXT;
    RETURN;
  END IF;

  BEGIN
    UPDATE public.customer_loyalty_points
    SET
      total_points = total_points - p_points,
      updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING total_points INTO v_remaining;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, v_current_points, ('Error updating loyalty points: ' || SQLERRM)::TEXT;
    RETURN;
  END;

  BEGIN
    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id)
    VALUES (p_user_id, -p_points, p_reason, NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  RETURN QUERY SELECT
    true,
    v_remaining,
    ('Successfully deducted ' || p_points::TEXT || ' points')::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_admin_points(UUID, BIGINT, TEXT) TO authenticated;
