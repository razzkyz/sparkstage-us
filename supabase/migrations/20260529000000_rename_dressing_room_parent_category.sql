-- ============================================
-- Migration: Rename parent category to "Dressing Room" and ensure subcategories
-- Date: 2026-05-29
-- Description: Rename "Fashion On Demand" parent to "Dressing Room",
--              and ensure all required subcategories exist under it.
-- ============================================

-- Step 1: Upsert the parent category "Dressing Room"
INSERT INTO public.dressing_room_categories (name, slug, parent_id, display_order, is_active)
VALUES ('Dressing Room', 'dressing-room', NULL, 0, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Step 2: Rename "Fashion On Demand" to "Dressing Room" if it still exists under old slug
UPDATE public.dressing_room_categories
SET
  name = 'Dressing Room',
  slug = 'dressing-room',
  updated_at = NOW()
WHERE slug = 'fashion-on-demand'
  AND NOT EXISTS (SELECT 1 FROM public.dressing_room_categories WHERE slug = 'dressing-room');

-- Step 3: Get the ID of the "Dressing Room" parent and upsert all subcategories
DO $$
DECLARE
  parent_id BIGINT;
BEGIN
  SELECT id INTO parent_id FROM public.dressing_room_categories WHERE slug = 'dressing-room';

  -- Upsert each subcategory (insert if not exists, update parent link if exists)
  INSERT INTO public.dressing_room_categories (name, slug, parent_id, display_order, is_active)
  VALUES
    ('Bottom',   'bottom',   parent_id, 1, true),
    ('Dress',    'dress',    parent_id, 2, true),
    ('Outer',    'outer',    parent_id, 3, true),
    ('Shoes',    'shoes',    parent_id, 4, true),
    ('Tengtop',  'tengtop',  parent_id, 5, true)
  ON CONFLICT (slug) DO UPDATE SET
    parent_id    = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_active    = EXCLUDED.is_active,
    updated_at   = NOW();
END $$;
