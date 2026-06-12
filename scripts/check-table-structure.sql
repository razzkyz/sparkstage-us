-- Check product_images table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_images'
ORDER BY ordinal_position;

-- Show sample data (10 rows)
SELECT *
FROM product_images
LIMIT 10;

-- Check URL patterns
SELECT 
  LEFT(image_url, 60) as url_pattern,
  COUNT(*) as count
FROM product_images
GROUP BY LEFT(image_url, 60)
ORDER BY count DESC
LIMIT 20;
