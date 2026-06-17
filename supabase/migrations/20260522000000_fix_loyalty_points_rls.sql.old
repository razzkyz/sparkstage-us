-- ============================================
-- Migration: Fix Loyalty Points RLS Policies
-- Date: 2026-05-22
-- Description: Fix RLS policies to properly check user_role_assignments table
--   instead of JWT claims (which are not configured in this app)
-- ============================================

-- Drop existing incorrect policies (they may not exist if creation failed before)
DROP POLICY IF EXISTS loyalty_points_select_admin ON public.customer_loyalty_points;
DROP POLICY IF EXISTS loyalty_history_select_admin ON public.loyalty_points_history;

-- Ensure RLS is enabled
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points_history ENABLE ROW LEVEL SECURITY;

-- Keep existing policy for users to view own data
-- (This should already exist: CREATE POLICY loyalty_points_select_own ...)

-- Create corrected policy for admins to view all loyalty points
CREATE POLICY loyalty_points_select_admin ON public.customer_loyalty_points
  FOR SELECT
  USING (
    auth.uid() = user_id  -- User can see own record
    OR
    EXISTS (  -- Or admin can see all
      SELECT 1 FROM public.user_role_assignments
      WHERE user_role_assignments.user_id = auth.uid()
      AND user_role_assignments.role_name IN ('admin', 'super_admin')
    )
  );

-- Create corrected policy for admins to view history
CREATE POLICY loyalty_history_select_admin ON public.loyalty_points_history
  FOR SELECT
  USING (
    auth.uid() = user_id  -- User can see own history
    OR
    EXISTS (  -- Or admin can see all
      SELECT 1 FROM public.user_role_assignments
      WHERE user_role_assignments.user_id = auth.uid()
      AND user_role_assignments.role_name IN ('admin', 'super_admin')
    )
  );
