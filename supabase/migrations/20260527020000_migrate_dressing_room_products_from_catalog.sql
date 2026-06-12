-- ============================================
-- Migration: Copy Dressing Room Products from public.products
-- Date: 2026-05-27
-- Description: Migrate existing dressing room products (category_id 102) to new dressing_room_products system
-- ============================================

-- Step 1: Copy products from public.products (category_id = 102) to dressing_room_products
INSERT INTO public.dressing_room_products (
  name, description, category, slug, image_url, is_active, created_at, updated_at
)
SELECT 
  p.name,
  p.description,
  'clothing',  -- default category for dressing room
  p.slug,
  COALESCE(p.image_url, NULL),
  COALESCE(p.is_active, true),
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, NOW())
FROM public.products p
WHERE p.category_id = 102  -- Dressing Room category
  AND p.deleted_at IS NULL  -- Only active products
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Copy product variants to dressing_room_product_variants
-- Map each public.product_variants to dressing_room_product_variants
INSERT INTO public.dressing_room_product_variants (
  dressing_room_product_id, name, sku,
  price, deposit_amount, daily_rental_fee,
  total_quantity, available_quantity, reserved_quantity,
  damaged_quantity, in_laundry_quantity, is_active, created_at, updated_at
)
SELECT 
  dp.id,  -- Foreign key to new dressing_room_products
  pv.name,
  pv.sku,
  pv.price,
  150000,  -- Default deposit for rental
  50000,   -- Default daily rental fee
  COALESCE(pv.stock, 0),  -- total_quantity
  COALESCE(pv.stock, 0),  -- available_quantity (all available initially)
  0,  -- reserved_quantity
  0,  -- damaged_quantity
  0,  -- in_laundry_quantity
  COALESCE(pv.is_active, true),
  COALESCE(pv.created_at, NOW()),
  COALESCE(pv.updated_at, NOW())
FROM public.product_variants pv
INNER JOIN public.products p ON pv.product_id = p.id
INNER JOIN public.dressing_room_products dp ON p.slug = dp.slug
WHERE p.category_id = 102  -- Dressing Room category
  AND p.deleted_at IS NULL  -- Only active products
ON CONFLICT (sku) DO NOTHING;

-- Step 3: Verify migration
DO $$
DECLARE
  old_product_count INT;
  new_product_count INT;
  old_variant_count INT;
  new_variant_count INT;
BEGIN
  SELECT COUNT(*) INTO old_product_count FROM public.products WHERE category_id = 102 AND deleted_at IS NULL;
  SELECT COUNT(*) INTO new_product_count FROM public.dressing_room_products;
  
  SELECT COUNT(*) INTO old_variant_count 
  FROM public.product_variants pv
  INNER JOIN public.products p ON pv.product_id = p.id
  WHERE p.category_id = 102 AND p.deleted_at IS NULL;
  
  SELECT COUNT(*) INTO new_variant_count FROM public.dressing_room_product_variants;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '- Old products (category_id=102): %', old_product_count;
  RAISE NOTICE '- New dressing_room_products: %', new_product_count;
  RAISE NOTICE '- Old variants (category_id=102): %', old_variant_count;
  RAISE NOTICE '- New dressing_room_product_variants: %', new_variant_count;
END $$;
