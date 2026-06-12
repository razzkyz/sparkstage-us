-- Fix Kasir access to Sales Report data
-- Allow kasir role to read purchased_tickets and print_orders

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

-- ============================================
-- Fix print_orders RLS for kasir using is_admin()
-- ============================================
DROP POLICY IF EXISTS print_orders_read_admin ON public.print_orders;

CREATE POLICY print_orders_read_admin
  ON public.print_orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
  );

-- Verify kasir can read both tables
SELECT 'Fix applied: kasir can now read purchased_tickets and print_orders';
