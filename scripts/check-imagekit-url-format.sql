-- Check actual ImageKit URL format in database
-- This will show us the real URL pattern

SELECT 
  id,
  product_id,
  image_url,
  provider
FROM product_images
WHERE provider = 'imagekit'
  OR image_url LIKE '%imagekit%'
LIMIT 10;

-- Count by provider
SELECT 
  provider,
  COUNT(*) as count
FROM product_images
GROUP BY provider
ORDER BY count DESC;

-- Show sample URLs from all providers
SELECT DISTINCT
  LEFT(image_url, 50) as url_sample,
  provider,
  COUNT(*) as count
FROM product_images
GROUP BY LEFT(image_url, 50), provider
ORDER BY count DESC
LIMIT 20;
