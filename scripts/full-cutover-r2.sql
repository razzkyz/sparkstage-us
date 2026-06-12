-- ============================================================================
-- FULL CUTOVER: ImageKit → Cloudflare R2
-- ============================================================================
-- Migrate ALL remaining 2,217 ImageKit images to R2
-- Date: 2026-06-10
-- ============================================================================

BEGIN;

-- Step 1: Add backup column (if not exists)
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

-- Step 2: Backup old ImageKit URLs
UPDATE product_images
SET imagekit_backup_url = image_url
WHERE image_url LIKE 'https://ik.imagekit.io/hjnuyz1t3/%'
  AND imagekit_backup_url IS NULL;

-- Step 3: Update ALL ImageKit URLs to R2
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
  RAISE NOTICE 'FULL CUTOVER VERIFICATION';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Total product images: %', total_count;
  RAISE NOTICE 'R2 (cdn.sparkstage55.com): % (%.1f%%)', r2_count, (r2_count::FLOAT / total_count * 100);
  RAISE NOTICE 'ImageKit remaining: % (%.1f%%)', imagekit_count, (imagekit_count::FLOAT / total_count * 100);
  RAISE NOTICE '================================================';
  
  IF r2_count >= 2227 THEN
    RAISE NOTICE '✅ FULL CUTOVER SUCCESSFUL! All images migrated to R2!';
    RAISE NOTICE '💰 Zero-cost egress is now ACTIVE!';
  ELSIF r2_count >= 2000 THEN
    RAISE NOTICE '⚠️ Almost complete: % images migrated', r2_count;
  ELSE
    RAISE WARNING '❌ Cutover incomplete: Only % images migrated', r2_count;
  END IF;
END $$;

-- Step 5: Show sample of migrated URLs
SELECT 
  id,
  product_id,
  LEFT(imagekit_backup_url, 70) as old_imagekit_url,
  LEFT(image_url, 70) as new_r2_url
FROM product_images
WHERE image_url LIKE 'https://cdn.sparkstage55.com/%'
ORDER BY id DESC
LIMIT 5;

-- ============================================================================
-- REVIEW RESULTS ABOVE CAREFULLY!
-- ============================================================================
-- 
-- Expected:
--   - R2 count: 2227 (100%)
--   - ImageKit count: 0 (0%)
--   - Sample URLs show: imagekit → cdn.sparkstage55.com
-- 
-- If results look correct:
--   Type: COMMIT;
--   And run to save changes
-- 
-- If something looks wrong:
--   Type: ROLLBACK;
--   And run to cancel (nothing will change)
-- 
-- ============================================================================

-- UNCOMMENT ONE OF THESE AFTER REVIEWING:
-- COMMIT;
-- ROLLBACK;
