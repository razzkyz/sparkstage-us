-- ============================================
-- Fix Admin Access to Products
-- ============================================
-- Created: 2026-06-19
-- Purpose: Allow admins to view ALL products (including inactive) for Store Inventory page

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow admin full access to products" ON public.products;
DROP POLICY IF EXISTS "Allow admin full access to product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow admin full access to categories" ON public.categories;

-- Products: Admin can see ALL products (including inactive/deleted)
CREATE POLICY "Allow admin full access to products"
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

-- Product Variants: Admin can see ALL variants
CREATE POLICY "Allow admin full access to product_variants"
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

-- Categories: Admin can see ALL categories
CREATE POLICY "Allow admin full access to categories"
ON public.categories
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

-- Grant permissions
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.product_variants TO authenticated;
GRANT ALL ON public.categories TO authenticated;

-- Comment
COMMENT ON POLICY "Allow admin full access to products" ON public.products IS 'Admins can view, create, update, and delete all products including inactive ones';
COMMENT ON POLICY "Allow admin full access to product_variants" ON public.product_variants IS 'Admins can view, create, update, and delete all product variants';
COMMENT ON POLICY "Allow admin full access to categories" ON public.categories IS 'Admins can view, create, update, and delete all categories';
