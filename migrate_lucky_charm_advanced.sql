-- =====================================================
-- ADVANCED MIGRATION SCRIPT: Products (Lucky Charm) → Retail_Product
-- Date: 2026-06-09
-- Description: Advanced migration dengan handling untuk edge cases
-- =====================================================

-- =====================================================
-- PART 1: PRE-FLIGHT CHECKS
-- =====================================================

-- Check 1: Apakah kategori Lucky Charm exists?
DO $$
DECLARE
  category_count INT;
BEGIN
  SELECT COUNT(*) INTO category_count
  FROM categories
  WHERE name ILIKE '%lucky charm%' OR slug ILIKE '%lucky-charm%';
  
  IF category_count = 0 THEN
    RAISE EXCEPTION 'Kategori Lucky Charm tidak ditemukan! Pastikan kategori sudah ada di database.';
  END IF;
  
  RAISE NOTICE 'Found % Lucky Charm categories', category_count;
END $$;

-- Check 2: Berapa banyak products yang akan dimigrate?
DO $$
DECLARE
  product_count INT;
  variant_count INT;
BEGIN
  SELECT COUNT(DISTINCT p.id) INTO product_count
  FROM products p
  INNER JOIN categories c ON p.category_id = c.id
  WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
    AND p.is_active = true
    AND p.deleted_at IS NULL;
  
  SELECT COUNT(*) INTO variant_count
  FROM products p
  INNER JOIN categories c ON p.category_id = c.id
  INNER JOIN product_variants pv ON pv.product_id = p.id
  WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND pv.is_active = true
    AND pv.deleted_at IS NULL;
  
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Products to migrate: %', product_count;
  RAISE NOTICE '  Total variants: %', variant_count;
  RAISE NOTICE '  Average variants per product: %', ROUND(variant_count::NUMERIC / NULLIF(product_count, 0), 2);
  RAISE NOTICE '===============================================';
END $$;

-- Check 3: Apakah ada slug conflicts?
DO $$
DECLARE
  conflict_count INT;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM (
    SELECT p.slug || '-' || LOWER(REPLACE(pv.sku, ' ', '-')) || '-retail' as new_slug
    FROM products p
    INNER JOIN categories c ON p.category_id = c.id
    INNER JOIN product_variants pv ON pv.product_id = p.id
    WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND pv.is_active = true
      AND pv.deleted_at IS NULL
  ) potential_slugs
  INNER JOIN product_retail pr ON pr.slug = potential_slugs.new_slug;
  
  IF conflict_count > 0 THEN
    RAISE WARNING 'Ditemukan % slug conflicts! Data existing akan di-skip.', conflict_count;
  ELSE
    RAISE NOTICE 'No slug conflicts detected. Safe to proceed.';
  END IF;
END $$;

-- =====================================================
-- PART 2: MIGRATION WITH CONFLICT HANDLING
-- =====================================================

-- Insert data dengan ON CONFLICT DO NOTHING untuk skip duplicates
INSERT INTO product_retail (
  name,
  slug,
  description,
  category_id,
  price,
  stock,
  weight,
  length,
  width,
  height,
  image,
  is_active,
  created_at,
  updated_at
)
SELECT 
  -- Gabungkan nama product + variant name
  CASE 
    WHEN pv.name IS NOT NULL AND pv.name != '' 
    THEN p.name || ' - ' || pv.name
    ELSE p.name
  END as name,
  
  -- Slug: product-slug-variant-sku-retail (or fallback to id)
  CASE 
    WHEN pv.sku IS NOT NULL AND pv.sku != ''
    THEN p.slug || '-' || LOWER(REPLACE(REPLACE(pv.sku, ' ', '-'), '/', '-')) || '-retail'
    ELSE p.slug || '-var-' || pv.id || '-retail'
  END as slug,
  
  -- Description: gabungkan dengan attributes jika ada
  CASE 
    WHEN pv.attributes IS NOT NULL AND pv.attributes::text != '{}' 
    THEN COALESCE(p.description, '') || E'\n\n📋 Spesifikasi:\n' || 
         (SELECT string_agg(key || ': ' || value, E'\n') 
          FROM jsonb_each_text(pv.attributes))
    ELSE p.description
  END as description,
  
  p.category_id,
  COALESCE(pv.price, 0) as price,
  COALESCE(pv.stock, 0) as stock,
  COALESCE(pv.weight, 0) as weight,
  NULL as length,
  NULL as width,
  NULL as height,
  
  -- Image: prefer primary image from product_images, fallback to product.image_url
  COALESCE(
    (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = true LIMIT 1),
    p.image_url
  ) as image,
  
  (p.is_active AND pv.is_active) as is_active,
  p.created_at,
  GREATEST(p.updated_at, pv.updated_at) as updated_at
  
FROM products p
INNER JOIN categories c ON p.category_id = c.id
INNER JOIN product_variants pv ON pv.product_id = p.id
WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
  AND p.is_active = true
  AND p.deleted_at IS NULL
  AND pv.is_active = true
  AND pv.deleted_at IS NULL
ORDER BY p.id, pv.id

-- Skip duplicates
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- PART 3: POST-MIGRATION REPORTS
-- =====================================================

-- Report 1: Migration Success Summary
DO $$
DECLARE
  total_migrated INT;
  total_active INT;
  total_inactive INT;
  avg_price NUMERIC;
  total_stock INT;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_active = true),
    COUNT(*) FILTER (WHERE is_active = false),
    ROUND(AVG(price), 2),
    SUM(stock)
  INTO total_migrated, total_active, total_inactive, avg_price, total_stock
  FROM product_retail
  WHERE slug LIKE '%-retail';
  
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Migration Completed!';
  RAISE NOTICE '  Total migrated: %', total_migrated;
  RAISE NOTICE '  Active products: %', total_active;
  RAISE NOTICE '  Inactive products: %', total_inactive;
  RAISE NOTICE '  Average price: Rp %', avg_price;
  RAISE NOTICE '  Total stock: % units', total_stock;
  RAISE NOTICE '===============================================';
END $$;

-- Report 2: Products without stock (potential issues)
SELECT 
  pr.id,
  pr.name,
  pr.slug,
  pr.price,
  pr.stock,
  c.name as category_name
FROM product_retail pr
LEFT JOIN categories c ON pr.category_id = c.id
WHERE pr.slug LIKE '%-retail'
  AND pr.stock = 0
ORDER BY pr.price DESC;

-- Report 3: Price distribution
SELECT 
  CASE 
    WHEN price < 50000 THEN 'Under 50k'
    WHEN price >= 50000 AND price < 100000 THEN '50k - 100k'
    WHEN price >= 100000 AND price < 200000 THEN '100k - 200k'
    WHEN price >= 200000 AND price < 500000 THEN '200k - 500k'
    ELSE 'Above 500k'
  END as price_range,
  COUNT(*) as product_count,
  SUM(stock) as total_stock,
  ROUND(AVG(price), 2) as avg_price
FROM product_retail
WHERE slug LIKE '%-retail'
GROUP BY 
  CASE 
    WHEN price < 50000 THEN 'Under 50k'
    WHEN price >= 50000 AND price < 100000 THEN '50k - 100k'
    WHEN price >= 100000 AND price < 200000 THEN '100k - 200k'
    WHEN price >= 200000 AND price < 500000 THEN '200k - 500k'
    ELSE 'Above 500k'
  END
ORDER BY 
  MIN(price);

-- =====================================================
-- PART 4: DATA QUALITY CHECKS
-- =====================================================

-- Check 1: Products with missing images
SELECT 
  'Missing Image' as issue_type,
  COUNT(*) as count
FROM product_retail
WHERE slug LIKE '%-retail'
  AND (image IS NULL OR image = '')
UNION ALL

-- Check 2: Products with zero price
SELECT 
  'Zero Price' as issue_type,
  COUNT(*) as count
FROM product_retail
WHERE slug LIKE '%-retail'
  AND price = 0
UNION ALL

-- Check 3: Products with zero weight
SELECT 
  'Zero Weight' as issue_type,
  COUNT(*) as count
FROM product_retail
WHERE slug LIKE '%-retail'
  AND weight = 0
UNION ALL

-- Check 4: Products with missing description
SELECT 
  'Missing Description' as issue_type,
  COUNT(*) as count
FROM product_retail
WHERE slug LIKE '%-retail'
  AND (description IS NULL OR description = '');

-- =====================================================
-- PART 5: FINAL VERIFICATION QUERY
-- =====================================================

SELECT 
  pr.id,
  pr.name,
  pr.slug,
  pr.description,
  pr.price,
  pr.stock,
  pr.weight,
  pr.image,
  pr.is_active,
  c.name as category_name,
  pr.created_at,
  pr.updated_at
FROM product_retail pr
LEFT JOIN categories c ON pr.category_id = c.id
WHERE pr.slug LIKE '%-retail'
ORDER BY pr.created_at DESC;
