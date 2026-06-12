-- Find categories that have active products

SELECT 
  c.id as category_id,
  c.name as category_name,
  c.slug as category_slug,
  COUNT(DISTINCT p.id) as total_products,
  COUNT(pv.id) as total_variants,
  SUM(CASE WHEN p.is_active = true THEN 1 ELSE 0 END) as active_products,
  SUM(CASE WHEN pv.is_active = true THEN 1 ELSE 0 END) as active_variants
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
LEFT JOIN product_variants pv ON pv.product_id = p.id
GROUP BY c.id, c.name, c.slug
HAVING COUNT(DISTINCT p.id) > 0
ORDER BY active_products DESC, total_products DESC;
