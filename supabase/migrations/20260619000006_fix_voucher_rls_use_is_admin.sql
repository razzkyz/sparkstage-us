-- Fix Voucher RLS to use is_admin() function for consistency
-- This ensures all admin roles (admin, super_admin, owner, devops) have access

-- Drop existing admin policies
DROP POLICY IF EXISTS "Allow admin full access to vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Allow admin read all voucher usage" ON public.voucher_usage;

-- Recreate vouchers policy with is_admin() function
CREATE POLICY "Admins have full access to vouchers"
  ON public.vouchers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Recreate voucher_usage policy with is_admin() function
CREATE POLICY "Admins can read all voucher usage"
  ON public.voucher_usage
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Add admin policy for UPDATE/DELETE on voucher_usage (for admin corrections)
CREATE POLICY "Admins can modify voucher usage"
  ON public.voucher_usage
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete voucher usage"
  ON public.voucher_usage
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
