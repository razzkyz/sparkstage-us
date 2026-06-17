-- ============================================
-- SparkStage US - Update URLs to R2 Custom Domain
-- Date: 2026-06-13
-- Description: Replace Unsplash URLs with R2 custom domain URLs
-- ============================================

-- ⚠️ IMPORTANT: Run this ONLY after:
--   1. R2 bucket copy is complete (all 2,230 files)
--   2. Custom domain is setup: cdn.sparkstage-us.com
--   3. Custom domain is verified working

-- ============================================
-- DELETE OLD SAMPLE DATA (Unsplash images)
-- ============================================

-- Delete old product images (Unsplash URLs)
DELETE FROM public.product_images;

-- Delete old products and variants
DELETE FROM public.product_variants;
DELETE FROM public.products;
DELETE FROM public.categories;

-- Reset sequences
SELECT setval('public.categories_id_seq', 1, false);
SELECT setval('public.products_id_seq', 1, false);
SELECT setval('public.product_variants_id_seq', 1, false);
SELECT setval('public.product_images_id_seq', 1, false);

-- ============================================
-- NOTE: Real Product Data
-- ============================================

-- The real product data with R2 URLs will be migrated from Indonesia database
-- This is just a placeholder migration to clean up Unsplash URLs

-- To migrate real data:
-- 1. Export products from Indonesia: SELECT * FROM products, product_variants, product_images
-- 2. Update image URLs: REPLACE 'cdn.sparkstage55.com' WITH 'cdn.sparkstage-us.com'
-- 3. Import to US database

-- ============================================
-- ALTERNATIVE: Keep Sample Data with R2 URLs
-- ============================================

-- If you want to keep sample data but use R2 URLs from copied files:
-- Uncomment and customize these INSERT statements:

/*
-- Sample categories
INSERT INTO public.categories (id, name, slug, description, color, is_active) VALUES
(1, 'Beauty', 'beauty', 'Beauty and cosmetics products', '#FF69B4', true),
(2, 'Fashion', 'fashion', 'Clothing and accessories', '#9370DB', true);

-- Sample products (using actual R2 files from Indonesia bucket)
INSERT INTO public.products (id, name, description, category_id, is_active) VALUES
(1000, 'Sample Product 1', 'This is a sample product from R2', 1, true),
(1001, 'Sample Product 2', 'This is another sample product', 1, true);

-- Sample variants
INSERT INTO public.product_variants (id, product_id, variant_name, sku, price, stock, is_active) VALUES
(1, 1000, 'Variant 1', 'SKU-1000-1', 2999, 100, true),
(2, 1001, 'Variant 2', 'SKU-1001-1', 3499, 100, true);

-- Sample images using R2 custom domain
INSERT INTO public.product_images (product_id, image_url, display_order) VALUES
(1000, 'https://cdn.sparkstage-us.com/products/1000/2bade654-1569-4ff7-9898-bb1122142d15.png', 1),
(1001, 'https://cdn.sparkstage-us.com/products/1001/f6006b43-8ffc-4cd5-bb12-13fba5424742.png', 1);

-- Reset sequences
SELECT setval('public.categories_id_seq', (SELECT MAX(id) FROM public.categories));
SELECT setval('public.products_id_seq', (SELECT MAX(id) FROM public.products));
SELECT setval('public.product_variants_id_seq', (SELECT MAX(id) FROM public.product_variants));
SELECT setval('public.product_images_id_seq', (SELECT MAX(id) FROM public.product_images));
*/

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Sample data cleaned up!';
  RAISE NOTICE '📋 Ready for real product data migration';
  RAISE NOTICE '🌐 Custom domain: cdn.sparkstage-us.com';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Verify R2 bucket copy is complete';
  RAISE NOTICE '2. Setup custom domain: cdn.sparkstage-us.com';
  RAISE NOTICE '3. Migrate real product data from Indonesia';
END $$;
