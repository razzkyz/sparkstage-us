-- Check detailed hero banner status
SELECT 
  id, 
  title, 
  banner_type, 
  is_active, 
  display_order, 
  image_url,
  title_image_url,
  link_url,
  created_at,
  updated_at
FROM public.banners
WHERE banner_type = 'hero'
ORDER BY display_order, is_active DESC;
