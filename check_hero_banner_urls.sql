-- Check hero banner image URLs to see if they have blue borders
SELECT 
  id,
  title,
  image_url,
  banner_type,
  is_active,
  display_order
FROM public.banners
WHERE banner_type = 'hero'
ORDER BY display_order, created_at;
