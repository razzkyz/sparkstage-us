-- Check keychain products and their categories
-- Run this to understand why keychain products are not showing in Shop

-- 1. Check all keychain products
SELECT 
  p.id,
  p.name,
  p.is_active,
  p.deleted_at,
  c.slug as category_slug,
  c.name as category_name,
  c.is_active as category_active
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE LOWER(p.name) LIKE '%keychain%'
   OR c.slug LIKE '%keychain%'
ORDER BY p.name;

-- 2. Count keychain products by status
SELECT 
  p.is_active as product_active,
  p.deleted_at IS NULL as not_deleted,
  c.is_active as category_active,
  c.slug as category_slug,
  COUNT(*) as total
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE LOWER(p.name) LIKE '%keychain%'
   OR c.slug LIKE '%keychain%'
GROUP BY p.is_active, p.deleted_at IS NULL, c.is_active, c.slug
ORDER BY total DESC;

-- 3. Check if category contains 'charm' or similar keywords
SELECT 
  p.id,
  p.name,
  c.slug as category_slug,
  CASE 
    WHEN LOWER(p.name) LIKE '%charm%' THEN 'Name contains charm'
    WHEN LOWER(p.name) LIKE '%lucky%' THEN 'Name contains lucky'
    WHEN LOWER(p.name) LIKE '%headliner%' THEN 'Name contains headliner'
    WHEN LOWER(p.name) LIKE '%pop socket%' THEN 'Name contains pop socket'
    WHEN LOWER(p.name) LIKE '%popsocket%' THEN 'Name contains popsocket'
    WHEN LOWER(p.name) LIKE '%speckles%' THEN 'Name contains speckles'
    ELSE 'OK'
  END as filter_reason,
  CASE
    WHEN c.slug IN ('charm', 'holiday', 'hobby', 'italian-bracket', 'pendant-charm', 
                    'welded-charm', 'edgy-soul', 'foodie', 'island-vibes', 'love', 
                    'lucky', 'lucky-charm', 'pets', 'pop-icon', 'sky-dream', 'soft-muse', 
                    'the-icon', 'zodiac', 'golden-charm-pendant', 'golden-charm-welded', 
                    'silver-charm-pendant', 'silver-charm-welded') THEN 'Charm Bar category'
    ELSE 'OK'
  END as category_filter_reason
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE (LOWER(p.name) LIKE '%keychain%' OR c.slug LIKE '%keychain%')
  AND p.is_active = true 
  AND p.deleted_at IS NULL
ORDER BY filter_reason, p.name;

-- 4. List all categories to understand the structure
SELECT 
  id,
  name,
  slug,
  parent_id,
  is_active
FROM categories
WHERE slug LIKE '%key%' 
   OR slug LIKE '%chain%'
   OR name LIKE '%keychain%'
ORDER BY name;
