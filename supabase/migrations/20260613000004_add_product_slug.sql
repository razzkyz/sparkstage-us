-- ============================================
-- Add slug column to products table
-- Required by frontend for product URLs
-- ============================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug (allow null for now)
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique 
ON public.products(slug) 
WHERE slug IS NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS products_slug_idx 
ON public.products(slug) 
WHERE slug IS NOT NULL;
