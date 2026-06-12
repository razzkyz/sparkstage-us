-- Script untuk mengecek struktur tabel products dan product_retail
-- dan mengambil data products dengan kategori lucky charm

-- 1. Cek struktur tabel products
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'products'
ORDER BY ordinal_position;

-- 2. Cek struktur tabel product_retail
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'product_retail'
ORDER BY ordinal_position;

-- 3. Cek kategori lucky charm
SELECT id, name, slug, parent_id
FROM categories
WHERE name ILIKE '%lucky%' OR name ILIKE '%charm%';

-- 4. Preview data products dengan kategori lucky charm
SELECT 
  p.id,
  p.name,
  p.slug,
  p.description,
  p.category_id,
  c.name as category_name,
  p.image_url,
  p.is_active,
  p.created_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE c.name ILIKE '%lucky%' OR c.name ILIKE '%charm%'
LIMIT 5;
