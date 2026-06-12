-- Migration: Fix Kasir access to Sales Report data
-- Date: 2026-06-06
-- Description: Allow kasir role to read purchased_tickets and print_orders
-- Fixes: Sales report showing 0 for tiket and cetak when logged in as kasir

-- ============================================
-- Fix purchased_tickets RLS for kasir
-- ============================================
DROP POLICY IF EXISTS purchased_tickets_select_own_or_admin_or_starguide ON public.purchased_tickets;

CREATE POLICY purchased_tickets_select_own_or_admin_or_starguide
  ON public.purchased_tickets
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = (SELECT auth.uid())
        AND role_name IN ('admin', 'super_admin', 'starguide', 'kasir')
    )
  );

-- Keep update policy admin-only
DROP POLICY IF EXISTS purchased_tickets_update_admin ON public.purchased_tickets;

CREATE POLICY purchased_tickets_update_admin
  ON public.purchased_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = (SELECT auth.uid())
        AND role_name IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = (SELECT auth.uid())
        AND role_name IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- Fix print_orders RLS for kasir
-- ============================================
DROP POLICY IF EXISTS print_orders_read_admin ON public.print_orders;

CREATE POLICY print_orders_read_admin
  ON public.print_orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- Grant read-only access to authenticated
GRANT SELECT ON public.purchased_tickets TO authenticated;
GRANT SELECT ON public.print_orders TO authenticated;
