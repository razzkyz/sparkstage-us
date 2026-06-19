-- ============================================
-- Fix Product Images RLS Policies
-- ============================================
-- Created: 2026-06-19
-- Purpose: Add RLS policies for product_images table to allow read access

-- Enable RLS on product_images if not already enabled
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Allow public read access to product images" ON public.product_images;
DROP POLICY IF EXISTS "Allow admin full access to product images" ON public.product_images;

-- Policy 1: Public read access to product images
-- Anyone (authenticated or anonymous) can view product images
CREATE POLICY "Allow public read access to product images"
  ON public.product_images
  FOR SELECT
  TO public
  USING (true);

-- Policy 2: Admin full access (insert, update, delete)
-- Only authenticated users with admin role can manage product images
CREATE POLICY "Allow admin full access to product images"
  ON public.product_images
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      WHERE ura.user_id = auth.uid()
        AND ura.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_role_assignments ura
      WHERE ura.user_id = auth.uid()
        AND ura.role IN ('admin', 'super_admin')
    )
  );

-- Grant necessary permissions
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO authenticated;

-- Comment for documentation
COMMENT ON TABLE public.product_images IS 'Product gallery images with RLS enabled for public read and admin write access';
