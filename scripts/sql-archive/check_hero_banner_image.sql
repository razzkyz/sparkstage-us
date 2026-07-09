-- Check hero banner image URLs to see if they are valid
SELECT 
  id, 
  title, 
  is_active, 
  display_order, 
  image_url,
  title_image_url,
  link_url,
  CASE 
    WHEN image_url IS NULL OR image_url = '' THEN 'MISSING_IMAGE'
    WHEN image_url LIKE 'http%' THEN 'EXTERNAL_URL'
    WHEN image_url LIKE '/%' THEN 'LOCAL_PATH'
    ELSE 'UNKNOWN_FORMAT'
  END as image_status
FROM public.banners
WHERE banner_type = 'hero'
ORDER BY display_order;
