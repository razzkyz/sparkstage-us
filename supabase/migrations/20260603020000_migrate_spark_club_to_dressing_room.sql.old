-- ============================================
-- Migration: Copy Spark Club Products to Dressing Room
-- Date: 2026-06-03
-- Description: Clear existing dressing room products and copy products from 'spark-club' category (and subcategories) to new dressing_room_products system.
-- ============================================

-- Step 1: Clear existing dressing room products (this will cascade to variants and other related tables if properly configured, but we'll do it explicitly just in case)
TRUNCATE TABLE public.dressing_room_product_variants CASCADE;
TRUNCATE TABLE public.dressing_room_products CASCADE;

-- Step 2: Copy products from public.products (category slug = 'spark-club' or its descendants)
WITH RECURSIVE cat_tree AS (
    SELECT id, name, slug FROM public.categories WHERE slug = 'spark-club'
    UNION ALL
    SELECT c.id, c.name, c.slug FROM public.categories c INNER JOIN cat_tree t ON c.parent_id = t.id
)
INSERT INTO public.dressing_room_products (
  name, description, category, slug, image_url, is_active, created_at, updated_at
)
SELECT 
  p.name,
  p.description,
  c.slug,  -- using slug instead of name so it matches the URLs/filters perfectly, or c.name. Wait, user wants category name
  p.slug,
  COALESCE(p.image_url, NULL),
  COALESCE(p.is_active, true),
  COALESCE(p.created_at, NOW()),
  COALESCE(p.updated_at, NOW())
FROM public.products p
JOIN cat_tree c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Copy product variants to dressing_room_product_variants
WITH RECURSIVE cat_tree AS (
    SELECT id, name, slug FROM public.categories WHERE slug = 'spark-club'
    UNION ALL
    SELECT c.id, c.name, c.slug FROM public.categories c INNER JOIN cat_tree t ON c.parent_id = t.id
)
INSERT INTO public.dressing_room_product_variants (
  dressing_room_product_id, name, sku,
  price, deposit_amount, daily_rental_fee,
  total_quantity, available_quantity, reserved_quantity,
  damaged_quantity, in_laundry_quantity, is_active, created_at, updated_at
)
SELECT 
  dp.id,  -- Foreign key to new dressing_room_products
  pv.name,
  pv.sku,
  pv.price,
  50000,   -- Default deposit for rental
  35000,   -- Default daily rental fee (as per previous instructions: 35k rent, 50k deposit)
  COALESCE(pv.stock, 0),  -- total_quantity
  COALESCE(pv.stock, 0),  -- available_quantity (all available initially)
  0,  -- reserved_quantity
  0,  -- damaged_quantity
  0,  -- in_laundry_quantity
  COALESCE(pv.is_active, true),
  COALESCE(pv.created_at, NOW()),
  COALESCE(pv.updated_at, NOW())
FROM public.product_variants pv
INNER JOIN public.products p ON pv.product_id = p.id
INNER JOIN cat_tree c ON p.category_id = c.id
INNER JOIN public.dressing_room_products dp ON p.slug = dp.slug
WHERE p.deleted_at IS NULL
ON CONFLICT (sku) DO NOTHING;
