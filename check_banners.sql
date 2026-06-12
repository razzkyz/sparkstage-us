-- Check all banners and their status
SELECT id, title, banner_type, is_active, display_order, image_url, title_image_url
FROM public.banners
ORDER BY banner_type, display_order;
