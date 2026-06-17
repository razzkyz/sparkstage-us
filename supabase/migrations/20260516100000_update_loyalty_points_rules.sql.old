-- ============================================
-- Migration: Update Loyalty Points Rules + Add Redeem Function
-- Date: 2026-05-16
-- Description:
--   1. Update ticket points: 1 poin per tiket → 20 poin per tiket
--   2. Add award_product_loyalty_points() for product/rental orders
--   3. Add redeem_loyalty_points() function for checkout discount
-- ============================================

-- 1. Update award_loyalty_points to give 20 points per ticket (was 1)
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_user_id UUID,
  p_order_id BIGINT,
  p_ticket_quantity BIGINT,
  p_reason TEXT DEFAULT 'Ticket purchase reward'
)
RETURNS TABLE(
  success BOOLEAN,
  total_points BIGINT,
  points_awarded BIGINT,
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
BEGIN
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_ticket_quantity < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  -- 20 points per ticket
  v_points_to_award := p_ticket_quantity * 20;

  BEGIN
    INSERT INTO public.customer_loyalty_points (user_id, total_points)
    VALUES (p_user_id, v_points_to_award)
    ON CONFLICT (user_id) DO UPDATE
    SET
      total_points = customer_loyalty_points.total_points + v_points_to_award,
      updated_at = NOW()
    RETURNING total_points INTO v_new_total;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, ('Error updating loyalty points: ' || SQLERRM)::TEXT;
    RETURN;
  END;

  BEGIN
    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id)
    VALUES (p_user_id, v_points_to_award, COALESCE(p_reason, 'Ticket purchase reward'), p_order_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  SELECT total_points INTO v_current_points
  FROM public.customer_loyalty_points
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    true,
    COALESCE(v_current_points, 0)::BIGINT,
    v_points_to_award,
    ('Successfully awarded ' || v_points_to_award::TEXT || ' points')::TEXT;
END;
$$;

-- 2. New function: award points for product/rental orders (20 points per item quantity)
CREATE OR REPLACE FUNCTION public.award_product_loyalty_points(
  p_user_id UUID,
  p_order_product_id BIGINT,
  p_total_quantity BIGINT,
  p_reason TEXT DEFAULT 'Product purchase reward'
)
RETURNS TABLE(
  success BOOLEAN,
  total_points BIGINT,
  points_awarded BIGINT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_to_award BIGINT;
  v_current_points BIGINT;
BEGIN
  IF p_user_id IS NULL OR p_order_product_id IS NULL OR p_total_quantity < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  -- 20 points per item (includes rental items)
  v_points_to_award := p_total_quantity * 20;

  BEGIN
    INSERT INTO public.customer_loyalty_points (user_id, total_points)
    VALUES (p_user_id, v_points_to_award)
    ON CONFLICT (user_id) DO UPDATE
    SET
      total_points = customer_loyalty_points.total_points + v_points_to_award,
      updated_at = NOW()
    RETURNING total_points INTO v_current_points;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, ('Error updating loyalty points: ' || SQLERRM)::TEXT;
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
    COALESCE(v_current_points, 0)::BIGINT,
    v_points_to_award,
    ('Successfully awarded ' || v_points_to_award::TEXT || ' points')::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_product_loyalty_points(UUID, BIGINT, BIGINT, TEXT) TO authenticated;

-- 3. New function: redeem points at checkout (1 point = Rp 1 discount)
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  p_user_id UUID,
  p_points_to_redeem BIGINT,
  p_reason TEXT DEFAULT 'Points redeemed at checkout'
)
RETURNS TABLE(
  success BOOLEAN,
  points_redeemed BIGINT,
  discount_amount BIGINT,
  remaining_points BIGINT,
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
BEGIN
  IF p_user_id IS NULL OR p_points_to_redeem < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::BIGINT, 'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  -- Get current balance
  SELECT total_points INTO v_current_points
  FROM public.customer_loyalty_points
  WHERE user_id = p_user_id;

  IF v_current_points IS NULL OR v_current_points < 1 THEN
    RETURN QUERY SELECT false, 0::BIGINT, 0::BIGINT, 0::BIGINT, 'Insufficient points balance'::TEXT;
    RETURN;
  END IF;

  -- Cannot redeem more than available
  v_actual_redeem := LEAST(p_points_to_redeem, v_current_points);

  -- Deduct points
  UPDATE public.customer_loyalty_points
  SET
    total_points = total_points - v_actual_redeem,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING total_points INTO v_remaining;

  -- Record in history (negative = deduction)
  BEGIN
    INSERT INTO public.loyalty_points_history (user_id, points_change, reason, order_id)
    VALUES (p_user_id, -v_actual_redeem, COALESCE(p_reason, 'Points redeemed at checkout'), NULL);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  -- 1 point = Rp 1 discount
  RETURN QUERY SELECT
    true,
    v_actual_redeem,
    v_actual_redeem,  -- discount_amount = same as points (1:1)
    COALESCE(v_remaining, 0)::BIGINT,
    ('Redeemed ' || v_actual_redeem::TEXT || ' points for Rp ' || v_actual_redeem::TEXT || ' discount')::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(UUID, BIGINT, TEXT) TO authenticated;

-- RLS: allow service role to call award_product_loyalty_points
GRANT EXECUTE ON FUNCTION public.award_loyalty_points(UUID, BIGINT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_product_loyalty_points(UUID, BIGINT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(UUID, BIGINT, TEXT) TO service_role;
