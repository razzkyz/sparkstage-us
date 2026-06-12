-- Check if any product_images reference /public/ folder in ImageKit

-- Query 1: Count images by folder path
SELECT 
  CASE 
    WHEN provider_file_path LIKE '/public/%' THEN 'public'
    WHEN provider_file_path LIKE '/products/%' THEN 'products'
    ELSE 'other'
  END AS folder_type,
  COUNT(*) as image_count
FROM product_images
WHERE provider = 'imagekit'
GROUP BY folder_type
ORDER BY image_count DESC;

-- Query 2: Sample /public/ folder images (if any)
SELECT 
  id,
  product_id,
  image_url,
  provider_file_path,
  is_primary,
  display_order
FROM product_images
WHERE 
  provider = 'imagekit'
  AND (
    image_url LIKE '%/public/%'
    OR provider_file_path LIKE '/public/%'
  )
ORDER BY product_id, display_order
LIMIT 20;

-- Query 3: Check if /public/ images are critical (primary images)
SELECT 
  COUNT(*) as total_public_images,
  SUM(CASE WHEN is_primary THEN 1 ELSE 0 END) as primary_images
FROM product_images
WHERE 
  provider = 'imagekit'
  AND (
    image_url LIKE '%/public/%'
    OR provider_file_path LIKE '/public/%'
  );

-- Query 4: Total ImageKit images breakdown
SELECT 
  'Total ImageKit images' as metric,
  COUNT(*) as count
FROM product_images
WHERE provider = 'imagekit'

UNION ALL

SELECT 
  'Images in /products/ folder' as metric,
  COUNT(*) as count
FROM product_images
WHERE provider = 'imagekit'
  AND provider_file_path LIKE '/products/%'

UNION ALL

SELECT 
  'Images in /public/ folder' as metric,
  COUNT(*) as count
FROM product_images
WHERE provider = 'imagekit'
  AND provider_file_path LIKE '/public/%'

UNION ALL

SELECT 
  'Images in other folders' as metric,
  COUNT(*) as count
FROM product_images
WHERE provider = 'imagekit'
  AND provider_file_path NOT LIKE '/products/%'
  AND provider_file_path NOT LIKE '/public/%';
