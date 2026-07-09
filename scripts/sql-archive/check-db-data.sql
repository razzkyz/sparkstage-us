-- Check if database has data

-- Check categories
SELECT COUNT(*) as category_count FROM categories;

-- Check products
SELECT COUNT(*) as product_count FROM products;

-- Check product images
SELECT COUNT(*) as image_count FROM product_images;

-- Show sample product images
SELECT id, product_id, image_url 
FROM product_images 
LIMIT 5;
