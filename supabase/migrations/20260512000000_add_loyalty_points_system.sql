-- ============================================
-- Migration: Add Loyalty Points System
-- Date: 2026-05-12
-- Description: Add customer loyalty points table and functions for ticket rewards
-- ============================================

-- Create customer_loyalty_points table
CREATE TABLE IF NOT EXISTS public.customer_loyalty_points (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_points_user_id 
  ON public.customer_loyalty_points(user_id);

-- Create loyalty_points_history table for audit trail
CREATE TABLE IF NOT EXISTS public.loyalty_points_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_change BIGINT NOT NULL,
  reason TEXT NOT NULL,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_loyalty_points_history_user_id 
  ON public.loyalty_points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_history_order_id 
  ON public.loyalty_points_history(order_id);

-- Create or replace function to award loyalty points
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
  -- Validate inputs
  IF p_user_id IS NULL OR p_order_id IS NULL OR p_ticket_quantity < 1 THEN
    RETURN QUERY SELECT 
      false,
      0::BIGINT,
      0::BIGINT,
      'Invalid input parameters'::TEXT;
    RETURN;
  END IF;

  -- Calculate points (1 point per ticket)
  v_points_to_award := p_ticket_quantity;

  -- Get current points or initialize if doesn't exist
  BEGIN
    INSERT INTO public.customer_loyalty_points (user_id, total_points)
    VALUES (p_user_id, v_points_to_award)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_points = total_points + v_points_to_award,
      updated_at = NOW()
    RETURNING total_points INTO v_new_total;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      false,
      0::BIGINT,
      0::BIGINT,
      'Error updating loyalty points: ' || SQLERRM::TEXT;
    RETURN;
  END;

  -- Record in history
  BEGIN
    INSERT INTO public.loyalty_points_history (
      user_id,
      points_change,
      reason,
      order_id
    )
    VALUES (
      p_user_id,
      v_points_to_award,
      COALESCE(p_reason, 'Ticket purchase reward'),
      p_order_id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Don't fail if history insert fails, just log it
    RAISE NOTICE 'Failed to insert loyalty history: %', SQLERRM;
  END;

  -- Get the current points count
  SELECT total_points INTO v_current_points
  FROM public.customer_loyalty_points
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT 
    true,
    COALESCE(v_current_points, 0)::BIGINT,
    v_points_to_award,
    'Successfully awarded ' || v_points_to_award::TEXT || ' points'::TEXT;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.award_loyalty_points(UUID, BIGINT, BIGINT, TEXT) 
  TO authenticated;

-- Create policy for viewing own loyalty points
CREATE POLICY loyalty_points_select_own ON public.customer_loyalty_points
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for admin to view all
CREATE POLICY loyalty_points_select_admin ON public.customer_loyalty_points
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@example.com');

-- Enable RLS
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points_history ENABLE ROW LEVEL SECURITY;

-- Create policies for history
CREATE POLICY loyalty_history_select_own ON public.loyalty_points_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY loyalty_history_select_admin ON public.loyalty_points_history
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'email' LIKE '%@example.com');
