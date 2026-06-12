-- Check table schema first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_images'
ORDER BY ordinal_position;

-- Total ImageKit images (check by URL pattern)
SELECT COUNT(*) as total_imagekit_images
FROM product_images
WHERE image_url LIKE 'https://ik.imagekit.io/%';

-- Breakdown by folder (if provider_file_path exists)
-- If this fails, we'll use image_url instead
SELECT 
  CASE 
    WHEN image_url LIKE '%/public/%' THEN 'public'
    WHEN image_url LIKE '%/products/%' THEN 'products'
    ELSE 'other'
  END AS folder,
  COUNT(*) as count
FROM product_images
WHERE image_url LIKE 'https://ik.imagekit.io/%'
GROUP BY folder
ORDER BY count DESC;

-- Sample from products folder
SELECT 
  id,
  product_id,
  image_url,
  is_primary,
  display_order
FROM product_images
WHERE image_url LIKE 'https://ik.imagekit.io/%/products/%'
LIMIT 5;

-- Sample from public folder
SELECT 
  id,
  product_id,
  image_url,
  is_primary,
  display_order
FROM product_images
WHERE image_url LIKE 'https://ik.imagekit.io/%/public/%'
LIMIT 5;
