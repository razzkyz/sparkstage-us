-- Add RLS policy for admins to view all rental orders
-- This allows admin users to view and manage all rental orders in the dashboard
-- Uses public.is_admin() instead of auth.users.raw_user_meta_data for security

CREATE POLICY "Admins can view all rental orders"
  ON public.rental_orders
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all rental orders"
  ON public.rental_orders
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can view all rental order items"
  ON public.rental_order_items
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all rental order items"
  ON public.rental_order_items
  FOR UPDATE
  USING (public.is_admin());
