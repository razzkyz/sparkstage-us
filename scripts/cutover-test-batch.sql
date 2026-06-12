-- TEST BATCH CUTOVER: 10 Products Only
-- Safe cutover test before full migration
-- Date: 2026-06-10
-- URL Pattern: https://ik.imagekit.io/hjnuyz1t3/products/...

-- Show products that will be updated (preview)
SELECT 
  id,
  product_id,
  image_url as old_url,
  REPLACE(
    image_url,
    'https://ik.imagekit.io/hjnuyz1t3/',
    'https://cdn.sparkstage55.com/'
  ) as new_url
FROM product_images
WHERE image_url LIKE 'https://ik.imagekit.io/hjnuyz1t3/%'
LIMIT 10;

-- Update ONLY 10 products for testing
UPDATE product_images
SET image_url = REPLACE(
  image_url,
  'https://ik.imagekit.io/hjnuyz1t3/',
  'https://cdn.sparkstage55.com/'
)
WHERE id IN (
  SELECT id
  FROM product_images
  WHERE image_url LIKE 'https://ik.imagekit.io/hjnuyz1t3/%'
  LIMIT 10
);

-- Verify updated records
SELECT 
  id,
  product_id,
  image_url as new_url
FROM product_images
WHERE image_url LIKE 'https://cdn.sparkstage55.com/%'
ORDER BY id DESC
LIMIT 10;
