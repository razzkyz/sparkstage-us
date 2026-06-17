-- ============================================
-- Migration: Migrate Dressing Room Products
-- Date: 2026-05-26
-- Description: Move dressing room products from products table 
-- to dedicated dressing_room_products table for rental system
-- ============================================

-- ============================================
-- Step 1: Migrate Products to Dressing Room Products
-- ============================================

-- Find products in the dressing-room/fashion category
INSERT INTO public.dressing_room_products (
  name, description, category, slug, image_url,
  is_active, created_at, updated_at
)
SELECT 
  p.name,
  p.description,
  'clothing' as category,
  p.slug,
  p.image_url,
  p.is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM public.products p
INNER JOIN public.categories c ON p.category_id = c.id
WHERE (c.slug = 'fashion' OR c.name ILIKE '%dressing%' OR c.name ILIKE '%fashion%')
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.dressing_room_products drp
    WHERE drp.slug = p.slug
  );

-- ============================================
-- Step 2: Create mapping table for product ID migration
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_to_dr_product_mapping (
  old_product_id INTEGER PRIMARY KEY,
  new_dr_product_id BIGINT NOT NULL REFERENCES public.dressing_room_products(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Populate mapping table
INSERT INTO public.product_to_dr_product_mapping (old_product_id, new_dr_product_id)
SELECT p.id, drp.id
FROM public.products p
INNER JOIN public.categories c ON p.category_id = c.id
JOIN public.dressing_room_products drp ON p.slug = drp.slug
WHERE (c.slug = 'fashion' OR c.name ILIKE '%dressing%' OR c.name ILIKE '%fashion%')
AND p.deleted_at IS NULL
ON CONFLICT (old_product_id) DO NOTHING;

-- ============================================
-- Step 3: Migrate Product Variants
-- ============================================

CREATE TABLE IF NOT EXISTS public.product_variant_to_dr_variant_mapping (
  old_variant_id INTEGER PRIMARY KEY,
  new_dr_variant_id BIGINT NOT NULL REFERENCES public.dressing_room_product_variants(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert dressing room product variants
INSERT INTO public.dressing_room_product_variants (
  dressing_room_product_id, name, sku, size_label, color,
  price, deposit_amount, daily_rental_fee,
  total_quantity, available_quantity, reserved_quantity,
  damaged_quantity, in_laundry_quantity,
  is_active, created_at, updated_at
)
SELECT 
  ptm.new_dr_product_id,
  pv.name,
  pv.sku,
  pv.attributes->>'size' as size_label,
  pv.attributes->>'color' as color,
  pv.price,
  0 as deposit_amount,
  15000 as daily_rental_fee,
  COALESCE(pv.stock, 0) as total_quantity,
  COALESCE(pv.stock, 0) - COALESCE(pv.reserved_stock, 0) as available_quantity,
  COALESCE(pv.reserved_stock, 0) as reserved_quantity,
  0 as damaged_quantity,
  0 as in_laundry_quantity,
  pv.is_active,
  pv.created_at,
  pv.updated_at
FROM public.product_variants pv
JOIN public.product_to_dr_product_mapping ptm ON pv.product_id = ptm.old_product_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.dressing_room_product_variants drpv
  WHERE drpv.sku = pv.sku AND drpv.dressing_room_product_id = ptm.new_dr_product_id
);

-- Populate variant mapping
INSERT INTO public.product_variant_to_dr_variant_mapping (old_variant_id, new_dr_variant_id)
SELECT pv.id, drpv.id
FROM public.product_variants pv
JOIN public.product_to_dr_product_mapping ptm ON pv.product_id = ptm.old_product_id
JOIN public.dressing_room_product_variants drpv 
  ON drpv.sku = pv.sku 
  AND drpv.dressing_room_product_id = ptm.new_dr_product_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.product_variant_to_dr_variant_mapping
  WHERE old_variant_id = pv.id
);

-- ============================================
-- Step 4: Update Rental Order Items to reference new variants
-- ============================================

-- Update existing rental_order_items to link to dr_product_variant_id
UPDATE public.rental_order_items roi
SET dressing_room_product_variant_id = pvtdm.new_dr_variant_id
FROM public.product_variant_to_dr_variant_mapping pvtdm
WHERE roi.product_variant_id = pvtdm.old_variant_id
  AND roi.dressing_room_product_variant_id IS NULL;

-- ============================================
-- Step 5: Verification & Logging
-- ============================================

-- Log migration results
DO $$
DECLARE
  migrated_products INT;
  migrated_variants INT;
  updated_rentals INT;
BEGIN
  SELECT COUNT(*) INTO migrated_products FROM public.product_to_dr_product_mapping;
  SELECT COUNT(*) INTO migrated_variants FROM public.product_variant_to_dr_variant_mapping;
  SELECT COUNT(*) INTO updated_rentals 
  FROM public.rental_order_items 
  WHERE dressing_room_product_variant_id IS NOT NULL;
  
  RAISE NOTICE 'Migration Complete:';
  RAISE NOTICE '  - Migrated % products to dressing_room_products', migrated_products;
  RAISE NOTICE '  - Migrated % variants to dressing_room_product_variants', migrated_variants;
  RAISE NOTICE '  - Updated % rental order items to reference new variants', updated_rentals;
END $$;

-- ============================================
-- Step 6: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_product_to_dr_mapping_old_id 
  ON public.product_to_dr_product_mapping(old_product_id);

CREATE INDEX IF NOT EXISTS idx_product_to_dr_mapping_new_id 
  ON public.product_to_dr_product_mapping(new_dr_product_id);

CREATE INDEX IF NOT EXISTS idx_variant_to_dr_mapping_old_id 
  ON public.product_variant_to_dr_variant_mapping(old_variant_id);

CREATE INDEX IF NOT EXISTS idx_variant_to_dr_mapping_new_id 
  ON public.product_variant_to_dr_variant_mapping(new_dr_variant_id);
