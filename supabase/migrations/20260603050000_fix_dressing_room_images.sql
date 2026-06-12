-- ============================================
-- Migration: Fix Dressing Room Product Images
-- Date: 2026-06-03
-- Description: Update dressing_room_products.image_url from product_images table
-- ============================================

UPDATE public.dressing_room_products dp
SET image_url = pi.image_url
FROM public.products p
JOIN public.product_images pi ON p.id = pi.product_id
WHERE dp.slug = p.slug
  AND pi.is_primary = true
  AND (dp.image_url IS NULL OR dp.image_url = '');
  
-- Also fallback to the first image if there is no primary image
UPDATE public.dressing_room_products dp
SET image_url = sub.image_url
FROM (
  SELECT p.slug, MIN(pi.image_url) as image_url
  FROM public.products p
  JOIN public.product_images pi ON p.id = pi.product_id
  GROUP BY p.slug
) sub
WHERE dp.slug = sub.slug
  AND (dp.image_url IS NULL OR dp.image_url = '');
