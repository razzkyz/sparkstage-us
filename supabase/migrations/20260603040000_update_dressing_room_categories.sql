-- ============================================
-- Migration: Update Dressing Room Subcategories
-- Date: 2026-06-03
-- Description: Replace existing dressing room subcategories with a new specific list.
-- ============================================

DO $$
DECLARE
  v_parent_id BIGINT;
BEGIN
  -- 1. Get the parent 'dressing-room' ID
  SELECT id INTO v_parent_id FROM public.dressing_room_categories WHERE slug = 'dressing-room';

  -- 2. Delete existing subcategories for dressing-room
  -- This will set dressing_room_category_id to NULL in dressing_room_products due to ON DELETE SET NULL
  DELETE FROM public.dressing_room_categories WHERE parent_id = v_parent_id;

  -- 3. Insert new subcategories
  INSERT INTO public.dressing_room_categories (name, slug, parent_id, display_order, is_active)
  VALUES
    ('Bag', 'bag', v_parent_id, 1, true),
    ('Belt', 'belt', v_parent_id, 2, true),
    ('Boots', 'boots', v_parent_id, 3, true),
    ('Headwear', 'headwear', v_parent_id, 4, true),
    ('Heels', 'heels', v_parent_id, 5, true),
    ('Hoodie', 'hoodie', v_parent_id, 6, true),
    ('Jeans', 'jeans', v_parent_id, 7, true),
    ('Maxi Dress', 'maxi-dress', v_parent_id, 8, true),
    ('Maxi Skirt', 'maxi-skirt', v_parent_id, 9, true),
    ('Mini Dress', 'mini-dress', v_parent_id, 10, true),
    ('Mini Skirt', 'mini-skirt', v_parent_id, 11, true),
    ('Tie', 'tie', v_parent_id, 12, true),
    ('Top', 'top', v_parent_id, 13, true),
    ('Two-piece Set', 'two-piece-set', v_parent_id, 14, true)
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

END $$;

-- 4. Re-link dressing room products to the new categories based on the product's 'category' string
-- The 'category' string in dressing_room_products holds the slug of the original category
UPDATE public.dressing_room_products p
SET dressing_room_category_id = c.id
FROM public.dressing_room_categories c
WHERE p.category = c.slug;
