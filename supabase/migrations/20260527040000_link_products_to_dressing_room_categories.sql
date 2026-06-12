-- ============================================
-- Migration: Link products to dressing room categories
-- Date: 2026-05-27
-- Description: Add dressing_room_category_id to products table and ensure categories exist
-- ============================================

-- Step 0: Ensure dressing_room_categories table exists (fallback)
CREATE TABLE IF NOT EXISTS public.dressing_room_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES public.dressing_room_categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dressing_room_categories_slug ON public.dressing_room_categories(slug);
CREATE INDEX IF NOT EXISTS idx_dressing_room_categories_parent_id ON public.dressing_room_categories(parent_id);

-- Ensure main category exists
INSERT INTO public.dressing_room_categories (name, slug, parent_id, display_order, is_active)
VALUES ('Fashion On Demand', 'fashion-on-demand', NULL, 0, true)
ON CONFLICT (slug) DO NOTHING;

-- Ensure subcategories exist
INSERT INTO public.dressing_room_categories (name, slug, parent_id, display_order, is_active)
SELECT 
  subcategory.name,
  subcategory.slug,
  (SELECT id FROM public.dressing_room_categories WHERE slug = 'fashion-on-demand'),
  subcategory.order_num,
  true
FROM (
  VALUES
    ('Bottom', 'bottom', 1),
    ('Dress', 'dress', 2),
    ('Outer', 'outer', 3),
    ('Shoes', 'shoes', 4),
    ('Tengtop', 'tengtop', 5)
) AS subcategory(name, slug, order_num)
ON CONFLICT (slug) DO NOTHING;

-- Step 1: Add dressing_room_category_id column to products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'dressing_room_category_id'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN dressing_room_category_id BIGINT REFERENCES public.dressing_room_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 2: Create index for efficient filtering (if not exists)
CREATE INDEX IF NOT EXISTS idx_products_dressing_room_category_id 
ON public.products(dressing_room_category_id) 
WHERE category_id = 102 AND deleted_at IS NULL;


