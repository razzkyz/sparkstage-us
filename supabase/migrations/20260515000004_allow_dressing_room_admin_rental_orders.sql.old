-- ============================================
-- Migration: Allow Dressing Room Admin Rental Orders Access
-- Date: 2026-05-15
-- Description: Grant dressing_room_admin access to rental_orders and rental_order_items
-- ============================================

CREATE POLICY "rental_orders_dra_all"
  ON public.rental_orders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

CREATE POLICY "rental_order_items_dra_all"
  ON public.rental_order_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );
