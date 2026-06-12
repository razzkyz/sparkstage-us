-- Check if hero banner exists and when it was deleted/modified
-- This will help us understand what happened to the hero banner

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
ORDER BY updated_at DESC;

-- Also check all banners to see what types exist
SELECT 
  banner_type, 
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM public.banners
GROUP BY banner_type
ORDER BY banner_type;
