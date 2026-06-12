-- ============================================
-- Migration: Link copied spark club products to dressing room categories
-- Date: 2026-06-03
-- ============================================

UPDATE public.dressing_room_products p
SET dressing_room_category_id = c.id
FROM public.dressing_room_categories c
WHERE p.category = c.slug;
