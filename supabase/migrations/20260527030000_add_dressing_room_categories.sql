-- ============================================
-- Migration: Add Dressing Room Categories
-- Date: 2026-05-27
-- Description: Create dressing room product categories and subcategories
-- ============================================

-- Create dressing room categories table
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

-- Insert main category
INSERT INTO public.dressing_room_categories (name, slug, parent_id, display_order, is_active)
VALUES ('Fashion On Demand', 'fashion-on-demand', NULL, 0, true)
ON CONFLICT (slug) DO NOTHING;

-- Insert subcategories
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

-- Update dressing_room_products with correct categories based on product category_name
UPDATE public.dressing_room_products dp
SET category = LOWER(COALESCE(p.category_name, 'clothing'))
FROM public.products p
WHERE p.id = (
  SELECT id FROM public.products 
  WHERE slug = dp.slug 
  LIMIT 1
);

-- Verify migration
DO $$
DECLARE
  category_count INT;
  product_count INT;
BEGIN
  SELECT COUNT(*) INTO category_count FROM public.dressing_room_categories WHERE is_active = true;
  SELECT COUNT(*) INTO product_count FROM public.dressing_room_products WHERE category != 'clothing';
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '- Dressing Room Categories Created: %', category_count;
  RAISE NOTICE '- Products Updated with Categories: %', product_count;
END $$;
