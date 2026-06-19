-- ============================================
-- Align US Products Schema with Indonesia Version
-- ============================================
-- Created: 2026-06-19
-- Purpose: Add missing columns to match Indonesia version schema
--          This prevents schema mismatch errors between frontend and database

-- Add slug and sku columns to products table if they don't exist
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS sku TEXT;

-- Rename variant_name to name in product_variants to match Indonesia schema
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'product_variants' 
        AND column_name = 'variant_name'
    ) THEN
        ALTER TABLE public.product_variants RENAME COLUMN variant_name TO name;
    END IF;
END $$;

-- Generate slug from name for existing products with unique handling
UPDATE public.products 
SET slug = lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || id::text
WHERE slug IS NULL OR slug = '';

-- Generate sku from id for existing products
UPDATE public.products 
SET sku = 'PROD-' || LPAD(id::text, 5, '0')
WHERE sku IS NULL OR sku = '';

-- Create unique index on products.slug (optional but recommended)
DROP INDEX IF EXISTS products_slug_idx;
DROP INDEX IF EXISTS products_slug_unique;
CREATE UNIQUE INDEX products_slug_unique ON public.products(slug) WHERE deleted_at IS NULL;

-- Create unique index on products.sku (optional but recommended)
DROP INDEX IF EXISTS products_sku_idx;
DROP INDEX IF EXISTS products_sku_unique;
CREATE UNIQUE INDEX products_sku_unique ON public.products(sku) WHERE deleted_at IS NULL;

-- Add NOT NULL constraints after backfilling data
ALTER TABLE public.products
ALTER COLUMN slug SET NOT NULL,
ALTER COLUMN sku SET NOT NULL;

-- Comment
COMMENT ON COLUMN public.products.slug IS 'URL-friendly product identifier';
COMMENT ON COLUMN public.products.sku IS 'Stock Keeping Unit - unique product identifier';
COMMENT ON COLUMN public.product_variants.name IS 'Variant name (e.g., Size M, Color Red)';
