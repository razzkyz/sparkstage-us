-- =====================================================
-- MIGRATION SCRIPT: Products (Lucky Charm) → Retail_Product
-- Date: 2026-06-09
-- Description: Migrate lucky charm products from old products table to new retail_product table
-- =====================================================
-- 
-- PERBEDAAN STRUKTUR TABEL:
-- ┌────────────────────┬──────────────────────┬─────────────────────────┐
-- │ Field              │ products (old)       │ product_retail (new)    │
-- ├────────────────────┼──────────────────────┼─────────────────────────┤
-- │ id                 │ BIGSERIAL            │ BIGINT (IDENTITY)       │
-- │ name               │ TEXT                 │ VARCHAR(255)            │
-- │ slug               │ TEXT (unique)        │ VARCHAR(255) (unique)   │
-- │ description        │ TEXT                 │ TEXT                    │
-- │ category_id        │ BIGINT (FK)          │ BIGINT (FK)             │
-- │ price              │ ❌ (di variants)     │ ✅ NUMERIC(12,2)        │
-- │ stock              │ ❌ (di variants)     │ ✅ INTEGER              │
-- │ weight             │ ❌ (di variants)     │ ✅ INTEGER              │
-- │ length             │ ❌                   │ ✅ INTEGER              │
-- │ width              │ ❌                   │ ✅ INTEGER              │
-- │ height             │ ❌                   │ ✅ INTEGER              │
-- │ image              │ image_url (TEXT)     │ image (VARCHAR 255)     │
-- │ is_active          │ BOOLEAN              │ BOOLEAN                 │
-- │ created_at         │ TIMESTAMPTZ          │ TIMESTAMPTZ             │
-- │ updated_at         │ TIMESTAMPTZ          │ TIMESTAMPTZ             │
-- └────────────────────┴──────────────────────┴─────────────────────────┘
--
-- STRATEGI MAPPING:
-- 1. Data price, stock, weight → ambil dari product_variants
-- 2. Jika product punya multiple variants → ambil variant dengan harga tertinggi (atau sum stock)
-- 3. length, width, height → NULL (tidak ada di tabel lama)
-- 4. slug → tambahkan suffix '-retail' untuk menghindari konflik
-- =====================================================

-- =====================================================
-- STEP 1: PREVIEW DATA YANG AKAN DIMIGRATE
-- =====================================================
-- Uncomment untuk melihat preview sebelum migrasi

/*
SELECT 
  p.id as product_id,
  p.name,
  p.slug,
  p.description,
  p.category_id,
  c.name as category_name,
  c.slug as category_slug,
  p.image_url,
  p.is_active as product_active,
  COUNT(pv.id) as total_variants,
  MAX(pv.price) as max_price,
  MIN(pv.price) as min_price,
  SUM(pv.stock) as total_stock,
  MAX(pv.weight) as max_weight
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
GROUP BY p.id, p.name, p.slug, p.description, p.category_id, c.name, c.slug, p.image_url, p.is_active
ORDER BY p.id;
*/

-- =====================================================
-- STEP 2A: OPSI 1 - Migrate dengan HARGA TERTINGGI per Product
-- =====================================================
-- Pilih 1 variant dengan harga tertinggi untuk represent product
-- Cocok jika: ingin ambil variant premium untuk e-commerce

/*
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
SELECT DISTINCT ON (p.id)
  p.name,
  p.slug || '-retail' as slug,
  p.description,
  p.category_id,
  COALESCE(pv.price, 0) as price,
  COALESCE(pv.stock, 0) as stock,
  COALESCE(pv.weight, 0) as weight,
  NULL as length,
  NULL as width,
  NULL as height,
  p.image_url as image,
  (p.is_active AND COALESCE(pv.is_active, true)) as is_active,
  p.created_at,
  p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
  AND p.is_active = true
  AND p.deleted_at IS NULL
ORDER BY p.id, pv.price DESC NULLS LAST, pv.stock DESC;
*/

-- =====================================================
-- STEP 2B: OPSI 2 - Migrate dengan TOTAL STOCK (SUM)
-- =====================================================
-- Aggregate semua variants jadi 1 product dengan total stock
-- Cocok jika: ingin gabungkan semua variants jadi 1 produk

/*
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
  p.name,
  p.slug || '-retail' as slug,
  p.description,
  p.category_id,
  MAX(pv.price) as price, -- ambil harga tertinggi
  SUM(COALESCE(pv.stock, 0)) as stock, -- total stock semua variants
  MAX(COALESCE(pv.weight, 0)) as weight, -- ambil weight terberat
  NULL as length,
  NULL as width,
  NULL as height,
  p.image_url as image,
  p.is_active as is_active,
  p.created_at,
  MAX(p.updated_at) as updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
  AND p.is_active = true
  AND p.deleted_at IS NULL
GROUP BY p.id, p.name, p.slug, p.description, p.category_id, p.image_url, p.is_active, p.created_at;
*/

-- =====================================================
-- STEP 2C: OPSI 3 - Migrate SETIAP VARIANT sebagai Product Terpisah
-- =====================================================
-- Setiap variant jadi 1 row di product_retail
-- Cocok jika: setiap variant punya perbedaan signifikan (warna, size, dll)

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
  -- Slug: product-slug-variant-sku-retail
  CASE 
    WHEN pv.sku IS NOT NULL AND pv.sku != ''
    THEN p.slug || '-' || LOWER(REPLACE(pv.sku, ' ', '-')) || '-retail'
    ELSE p.slug || '-' || pv.id || '-retail'
  END as slug,
  -- Description: gabungkan dengan attributes jika ada
  CASE 
    WHEN pv.attributes IS NOT NULL AND pv.attributes::text != '{}' 
    THEN p.description || E'\n\nSpesifikasi: ' || pv.attributes::text
    ELSE p.description
  END as description,
  p.category_id,
  COALESCE(pv.price, 0) as price,
  COALESCE(pv.stock, 0) as stock,
  COALESCE(pv.weight, 0) as weight,
  NULL as length,
  NULL as width,
  NULL as height,
  p.image_url as image,
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
ORDER BY p.id, pv.id;

-- =====================================================
-- STEP 3: VERIFICATION - Cek Hasil Migrasi
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
  c.name as category_name
FROM product_retail pr
LEFT JOIN categories c ON pr.category_id = c.id
WHERE pr.slug LIKE '%-retail'
ORDER BY pr.id DESC;

-- =====================================================
-- STEP 4 (OPTIONAL): ROLLBACK jika ada masalah
-- =====================================================

/*
-- Hapus semua data yang baru dimigrate
DELETE FROM product_retail
WHERE slug LIKE '%-retail';
*/
