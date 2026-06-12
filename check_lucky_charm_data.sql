-- Quick check: Apa ada products dengan kategori Lucky Charm?

-- 1. Check kategori Lucky Charm
SELECT 'Category Check' as check_type, id, name, slug, parent_id
FROM categories
WHERE name ILIKE '%lucky%' OR name ILIKE '%charm%' OR slug ILIKE '%lucky%' OR slug ILIKE '%charm%';

-- 2. Check products dengan kategori Lucky Charm
SELECT 'Products in Lucky Charm Category' as check_type, COUNT(*) as total_products
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%';

-- 3. Check products dengan kategori Lucky Charm (active only)
SELECT 'Active Products in Lucky Charm' as check_type, COUNT(*) as total_products
FROM products p
INNER JOIN categories c ON p.category_id = c.id
WHERE (c.name ILIKE '%lucky charm%' OR c.slug ILIKE '%lucky-charm%')
  AND p.is_active = true;

-- 4. List semua categories yang ada
SELECT 'All Categories' as check_type, id, name, slug
FROM categories
ORDER BY name;

-- 5. Sample products dari kategori apapun
SELECT 'Sample Products (any category)' as check_type, 
       p.id, 
       p.name, 
       c.name as category_name,
       p.is_active
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LIMIT 10;
