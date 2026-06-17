-- Migration: Allow Admin and Cashier Roles to access Product Orders and Items
-- Date: 2026-05-23
-- Description: Grant select/update access for order_products and select access for order_product_items to all admin/staff roles using is_admin()

-- Enable RLS (just in case)
ALTER TABLE public.order_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_product_items ENABLE ROW LEVEL SECURITY;

-- 1. Policies for order_products
DROP POLICY IF EXISTS "order_products_admin_select" ON public.order_products;
CREATE POLICY "order_products_admin_select"
  ON public.order_products FOR SELECT TO authenticated
  USING (
    public.is_admin()
  );

DROP POLICY IF EXISTS "order_products_admin_update" ON public.order_products;
CREATE POLICY "order_products_admin_update"
  ON public.order_products FOR UPDATE TO authenticated
  USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- 2. Policies for order_product_items
DROP POLICY IF EXISTS "order_product_items_admin_select" ON public.order_product_items;
CREATE POLICY "order_product_items_admin_select"
  ON public.order_product_items FOR SELECT TO authenticated
  USING (
    public.is_admin()
  );
