-- ============================================
-- Export Products from Indonesia Database
-- Run this in Indonesia Supabase SQL Editor
-- ============================================

-- Export Categories
SELECT 
    id,
    name,
    slug,
    description,
    color,
    is_active,
    parent_id,
    created_at,
    updated_at
FROM categories
WHERE deleted_at IS NULL
ORDER BY id;

-- Export Products
SELECT 
    id,
    name,
    description,
    category_id,
    is_active,
    created_at,
    updated_at
FROM products
WHERE deleted_at IS NULL
ORDER BY id;

-- Export Product Variants
SELECT 
    id,
    product_id,
    variant_name,
    sku,
    price,
    stock,
    weight,
    is_active,
    attributes,
    created_at,
    updated_at
FROM product_variants
WHERE deleted_at IS NULL
ORDER BY id;

-- Export Product Images (with URL update)
SELECT 
    id,
    product_id,
    -- Replace Indonesia CDN with US CDN
    REPLACE(image_url, 'cdn.sparkstage55.com', 'cdn-us.sparkstage55.com') as image_url,
    display_order,
    created_at,
    updated_at
FROM product_images
ORDER BY product_id, display_order;
