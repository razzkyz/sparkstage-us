-- Check ALL banners to see what exists
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
ORDER BY banner_type, display_order;
