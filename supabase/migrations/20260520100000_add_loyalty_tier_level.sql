-- ============================================
-- Migration: Add Loyalty Tier Level System
-- Date: 2026-05-20
-- Description: 
--   Add tier_level column to track highest rank achieved.
--   Rank will NOT reset when points are redeemed.
--   Only total_points decreases on redemption, tier_level stays.
-- ============================================

-- Add tier_level column (0=Stargazer, 1=Moonwalker, 2=Galaxian, 3=Supernova)
ALTER TABLE public.customer_loyalty_points
ADD COLUMN IF NOT EXISTS tier_level SMALLINT NOT NULL DEFAULT 0;

-- Backfill existing users: calculate tier_level from total_points
-- Stargazer: 0-199 → tier 0
-- Moonwalker: 200-499 → tier 1
-- Galaxian: 500-1499 → tier 2
-- Supernova: 1500+ → tier 3
UPDATE public.customer_loyalty_points
SET tier_level = CASE
  WHEN total_points >= 1500 THEN 3
  WHEN total_points >= 500 THEN 2
  WHEN total_points >= 200 THEN 1
  ELSE 0
END
WHERE tier_level = 0;

-- Create function to determine tier from points
CREATE OR REPLACE FUNCTION public.get_tier_level(p_points BIGINT)
RETURNS SMALLINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_points >= 1500 THEN RETURN 3;
  ELSIF p_points >= 500 THEN RETURN 2;
  ELSIF p_points >= 200 THEN RETURN 1;
  ELSE RETURN 0;
  END IF;
END;
$$;

-- DROP existing functions so we can recreate with new return types
DROP FUNCTION IF EXISTS public.award_loyalty_points(UUID, BIGINT, BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.award_product_loyalty_points(UUID, BIGINT, BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.redeem_loyalty_points(UUID, BIGINT, TEXT) CASCADE;

-- Recreate award_loyalty_points with tier_level in return type
CREATE FUNCTION public.award_loyalty_points(
  p_user_id UUID,
  p_order_id BIGINT,
  p_ticket_quantity BIGINT,
  p_reason TEXT DEFAULT 'Ticket purchase reward'
)
RETURNS TABLE(
  success BOOLEAN,
  total_points BIGINT,
  points_awarded BIGINT,
  tier_level SMALLINT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_to_award BIGINT;
  v_current_points BIGINT;
  v_new_total BIGINT;
  v_new_tier SMALLINT;
  v_current_tier SMALLINT;
BEGIN
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_ticket_quantity < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::SMALLINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  v_points_to_award := p_ticket_quantity * 20;

  BEGIN
    INSERT INTO public.customer_loyalty_points (user_id, total_points, tier_level)
    VALUES (p_user_id, v_points_to_award, public.get_tier_level(v_points_to_award))
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_points = customer_loyalty_points.total_points + v_points_to_award,
      tier_level = GREATEST(
        customer_loyalty_points.tier_level,
        public.get_tier_level(customer_loyalty_points.total_points + v_points_to_award)
      ),
      updated_at = NOW()
    RETURNING total_points, tier_level INTO v_new_total, v_new_tier;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::SMALLINT, ('Error updating loyalty points: ' || SQLERRM)::TEXT;
    RETURN;
  END;

  BEGIN
    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id)
    VALUES (p_user_id, v_points_to_award, COALESCE(p_reason, 'Ticket purchase reward'), p_order_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  RETURN QUERY SELECT
    true,
    v_new_total,
    v_points_to_award,
    v_new_tier,
    ('Successfully awarded ' || v_points_to_award::TEXT || ' points')::TEXT;
END;
$$;

-- Update award_product_loyalty_points to also update tier_level
CREATE FUNCTION public.award_product_loyalty_points(
  p_user_id UUID,
  p_order_product_id BIGINT,
  p_total_quantity BIGINT,
  p_reason TEXT DEFAULT 'Product purchase reward'
)
RETURNS TABLE(
  success BOOLEAN,
  total_points BIGINT,
  points_awarded BIGINT,
  tier_level SMALLINT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_to_award BIGINT;
  v_current_points BIGINT;
  v_new_total BIGINT;
  v_new_tier SMALLINT;
BEGIN
  IF p_user_id IS NULL OR p_order_product_id IS NULL OR p_total_quantity < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::SMALLINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  v_points_to_award := p_total_quantity * 20;

  BEGIN
    INSERT INTO public.customer_loyalty_points (user_id, total_points, tier_level)
    VALUES (p_user_id, v_points_to_award, public.get_tier_level(v_points_to_award))
    ON CONFLICT (user_id) DO UPDATE
    SET
      total_points = customer_loyalty_points.total_points + v_points_to_award,
      tier_level = GREATEST(
        customer_loyalty_points.tier_level,
        public.get_tier_level(customer_loyalty_points.total_points + v_points_to_award)
      ),
      updated_at = NOW()
    RETURNING total_points, tier_level INTO v_new_total, v_new_tier;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::SMALLINT, ('Error updating loyalty points: ' || SQLERRM)::TEXT;
    RETURN;
  END;

  BEGIN
    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id)
    VALUES (p_user_id, v_points_to_award, COALESCE(p_reason, 'Product purchase reward'), NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  SELECT total_points INTO v_current_points
  FROM public.customer_loyalty_points
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    true,
    v_new_total,
    v_points_to_award,
    v_new_tier,
    ('Successfully awarded ' || v_points_to_award::TEXT || ' points')::TEXT;
END;
$$;

-- Update redeem_loyalty_points: tier_level stays fixed, only total_points decreases
CREATE FUNCTION public.redeem_loyalty_points(
  p_user_id UUID,
  p_points_to_redeem BIGINT,
  p_reason TEXT DEFAULT 'Points redeemed at checkout'
)
RETURNS TABLE(
  success BOOLEAN,
  points_redeemed BIGINT,
  discount_amount BIGINT,
  remaining_points BIGINT,
  tier_level SMALLINT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points BIGINT;
  v_actual_redeem BIGINT;
  v_remaining BIGINT;
  v_current_tier SMALLINT;
BEGIN
  IF p_user_id IS NULL OR p_points_to_redeem < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::SMALLINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  -- Get current balance and tier
  SELECT total_points, tier_level INTO v_current_points, v_current_tier
  FROM public.customer_loyalty_points
  WHERE user_id = p_user_id;

  IF v_current_points IS NULL OR v_current_points < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::BIGINT, 0::SMALLINT, 'Insufficient points balance'::TEXT;
    RETURN;
  END IF;

  v_actual_redeem := LEAST(p_points_to_redeem, v_current_points);

  -- Deduct points, but DO NOT change tier_level
  UPDATE public.customer_loyalty_points
  SET
    total_points = total_points - v_actual_redeem,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_remaining;

  -- Record in history
  BEGIN
    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id)
    VALUES (p_user_id, -v_actual_redeem, COALESCE(p_reason, 'Points redeemed at checkout'), NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  RETURN QUERY SELECT
    true,
    v_actual_redeem,
    v_actual_redeem,
    v_remaining,
    v_current_tier,
    ('Successfully redeemed ' || v_actual_redeem::TEXT || ' points')::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_tier_level(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_points(UUID, BIGINT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_product_loyalty_points(UUID, BIGINT, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(UUID, BIGINT, TEXT) TO authenticated;
