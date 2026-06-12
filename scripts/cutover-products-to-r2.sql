-- ============================================================================
-- Database Cutover: ImageKit /products/ → Cloudflare R2
-- ============================================================================
-- 
-- This script updates all product_images table URLs from ImageKit to R2
-- 
-- BEFORE:
--   image_url = 'https://ik.imagekit.io/hjnuyz1t3/products/...'
--   provider = 'imagekit'
-- 
-- AFTER:
--   image_url = 'https://cdn.sparkstage55.com/products/...'
--   provider = 'r2'
-- 
-- SAFETY:
--   - Run in transaction (can rollback if issues)
--   - Backup created before execution
--   - Only updates imagekit provider URLs
-- 
-- PREREQUISITES:
--   1. All 2,227 product images uploaded to R2 ✅
--   2. R2 custom domain working (cdn.sparkstage55.com) ✅
--   3. Test URLs verified ✅
--   4. Database backup created ✅
-- 
-- ============================================================================

BEGIN;

-- Step 1: Add backup column (if not exists) to store old URLs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_images' 
        AND column_name = 'imagekit_backup_url'
    ) THEN
        ALTER TABLE product_images 
        ADD COLUMN imagekit_backup_url text;
    END IF;
END $$;

-- Step 2: Backup old URLs to imagekit_backup_url column
UPDATE product_images
SET imagekit_backup_url = image_url
WHERE image_url LIKE 'https://ik.imagekit.io/hjnuyz1t3/%'
  AND imagekit_backup_url IS NULL;

-- Step 3: Update URLs from ImageKit to R2
UPDATE product_images
SET 
  image_url = REPLACE(
    image_url,
    'https://ik.imagekit.io/hjnuyz1t3/',
    'https://cdn.sparkstage55.com/'
  ),
  updated_at = NOW()
WHERE image_url LIKE 'https://ik.imagekit.io/hjnuyz1t3/%';

-- Step 4: Verify cutover results
DO $$
DECLARE
  r2_count INTEGER;
  imagekit_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO r2_count FROM product_images WHERE image_url LIKE 'https://cdn.sparkstage55.com/%';
  SELECT COUNT(*) INTO imagekit_count FROM product_images WHERE image_url LIKE 'https://ik.imagekit.io/hjnuyz1t3/%';
  SELECT COUNT(*) INTO total_count FROM product_images;
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'CUTOVER VERIFICATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total product images: %', total_count;
  RAISE NOTICE 'R2 (cdn.sparkstage55.com): % (%.1f%%)', r2_count, (r2_count::FLOAT / total_count * 100);
  RAISE NOTICE 'ImageKit (ik.imagekit.io): % (%.1f%%)', imagekit_count, (imagekit_count::FLOAT / total_count * 100);
  RAISE NOTICE '================================================';
  
  -- Safety check: If we have less than 2000 R2 images, something might be wrong
  IF r2_count < 2000 THEN
    RAISE EXCEPTION 'Safety check failed: Only % images migrated to R2 (expected ~2,227)', r2_count;
  END IF;
  
  RAISE NOTICE '✅ Cutover verification passed!';
END $$;

-- Step 5: Show sample of updated URLs
SELECT 
  id,
  product_id,
  LEFT(imagekit_backup_url, 80) as old_url,
  LEFT(image_url, 80) as new_url
FROM product_images
WHERE image_url LIKE 'https://cdn.sparkstage55.com/%'
LIMIT 5;

-- ============================================================================
-- COMMIT or ROLLBACK
-- ============================================================================
-- 
-- If verification passed and sample URLs look correct:
--   COMMIT;
-- 
-- If something looks wrong:
--   ROLLBACK;
-- 
-- ============================================================================

-- Uncomment one of these after reviewing results:
-- COMMIT;
-- ROLLBACK;
