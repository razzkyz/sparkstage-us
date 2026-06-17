-- ============================================
-- Migration: Enhance Dressing Room Category Linking
-- Date: 2026-05-27
-- Description: Add proper category linking to dressing_room_products
-- ============================================

-- Add dressing_room_category_id column to dressing_room_products if it doesn't exist
ALTER TABLE public.dressing_room_products 
ADD COLUMN IF NOT EXISTS dressing_room_category_id BIGINT REFERENCES public.dressing_room_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dressing_room_products_category_id ON public.dressing_room_products(dressing_room_category_id);

-- Now we need to populate the category_id based on the category field
-- This maps text category names to the dressing_room_categories IDs

UPDATE public.dressing_room_products dp
SET dressing_room_category_id = (
  SELECT id FROM public.dressing_room_categories 
  WHERE slug = 
    CASE 
      WHEN LOWER(dp.category) IN ('bottom', 'bawahan') THEN 'bottom'
      WHEN LOWER(dp.category) IN ('dress', 'gaun') THEN 'dress'
      WHEN LOWER(dp.category) IN ('outer', 'jaket', 'cardigan') THEN 'outer'
      WHEN LOWER(dp.category) IN ('shoes', 'sepatu') THEN 'shoes'
      WHEN LOWER(dp.category) IN ('tengtop', 'atasan', 'top') THEN 'tengtop'
      ELSE NULL
    END
)
WHERE dressing_room_category_id IS NULL;

-- Add RLS policy for dressing_room_products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'dressing_room_products' 
      AND policyname = 'Dressing Room Products - SELECT Public'
  ) THEN
    CREATE POLICY "Dressing Room Products - SELECT Public"
      ON public.dressing_room_products
      FOR SELECT
      USING (is_active = true AND is_deleted = false);
  END IF;
END $$;

-- Verify the linking
DO $$
DECLARE
  total_products INT;
  categorized_products INT;
  uncategorized_products INT;
BEGIN
  SELECT COUNT(*) INTO total_products FROM public.dressing_room_products WHERE is_active = true;
  SELECT COUNT(*) INTO categorized_products FROM public.dressing_room_products WHERE is_active = true AND dressing_room_category_id IS NOT NULL;
  SELECT COUNT(*) INTO uncategorized_products FROM public.dressing_room_products WHERE is_active = true AND dressing_room_category_id IS NULL;
  
  RAISE NOTICE 'Dressing Room Category Linking Summary:';
  RAISE NOTICE '- Total active products: %', total_products;
  RAISE NOTICE '- Products with categories: %', categorized_products;
  RAISE NOTICE '- Products without categories: %', uncategorized_products;
END $$;
