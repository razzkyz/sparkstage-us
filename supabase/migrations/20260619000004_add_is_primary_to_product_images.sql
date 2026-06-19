-- ============================================
-- Add is_primary Column to Product Images
-- ============================================
-- Created: 2026-06-19
-- Purpose: Add is_primary column to match Indonesia schema
--          so product image queries work correctly

-- Add is_primary column (defaults to false)
ALTER TABLE public.product_images
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Create index for faster primary image lookups
CREATE INDEX IF NOT EXISTS idx_product_images_primary 
  ON public.product_images(product_id, is_primary)
  WHERE is_primary = true;

-- Comment for documentation
COMMENT ON COLUMN public.product_images.is_primary IS 'Marks the primary/featured image for a product';
