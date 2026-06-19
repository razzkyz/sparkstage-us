-- ============================================
-- Fix Admin RLS Policies - More Permissive
-- ============================================
-- Created: 2026-06-19
-- Purpose: Simplify admin access to products - allow ALL authenticated users to read

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow admin full access to products" ON public.products;
DROP POLICY IF EXISTS "Allow admin full access to product_variants" ON public.product_variants;

-- Products: Allow ALL authenticated users to SELECT (read)
-- Admins can do everything
CREATE POLICY "Authenticated users can view products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
  )
);

-- Product Variants: Allow ALL authenticated users to SELECT
-- Admins can do everything
CREATE POLICY "Authenticated users can view product_variants"
ON public.product_variants
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage product_variants"
ON public.product_variants
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_role_assignments
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin', 'owner')
  )
);

-- Comment
COMMENT ON POLICY "Authenticated users can view products" ON public.products IS 'All authenticated users can view products';
COMMENT ON POLICY "Admins can manage products" ON public.products IS 'Admins can insert, update, delete products';
COMMENT ON POLICY "Authenticated users can view product_variants" ON public.product_variants IS 'All authenticated users can view product variants';
COMMENT ON POLICY "Admins can manage product_variants" ON public.product_variants IS 'Admins can insert, update, delete product variants';
