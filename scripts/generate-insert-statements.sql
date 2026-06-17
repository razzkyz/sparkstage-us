-- ============================================
-- Generate INSERT Statements for US Database
-- Run this in Indonesia Supabase SQL Editor
-- This will generate INSERT statements that you can copy-paste to US database
-- ============================================

-- Generate INSERT for Categories
SELECT 
    'INSERT INTO categories (id, name, slug, description, color, is_active, parent_id, created_at, updated_at) VALUES ' ||
    string_agg(
        '(' || 
        id || ', ' ||
        '''' || REPLACE(name, '''', '''''') || ''', ' ||
        '''' || slug || ''', ' ||
        COALESCE('''' || REPLACE(description, '''', '''''') || '''', 'NULL') || ', ' ||
        COALESCE('''' || color || '''', 'NULL') || ', ' ||
        is_active || ', ' ||
        COALESCE(parent_id::text, 'NULL') || ', ' ||
        '''' || created_at || ''', ' ||
        '''' || updated_at || '''' ||
        ')',
        ', '
    ) || ';'
FROM categories
WHERE deleted_at IS NULL;

-- Generate INSERT for Products
SELECT 
    'INSERT INTO products (id, name, description, category_id, is_active, created_at, updated_at) VALUES ' ||
    string_agg(
        '(' || 
        id || ', ' ||
        '''' || REPLACE(name, '''', '''''') || ''', ' ||
        COALESCE('''' || REPLACE(description, '''', '''''') || '''', 'NULL') || ', ' ||
        category_id || ', ' ||
        is_active || ', ' ||
        '''' || created_at || ''', ' ||
        '''' || updated_at || '''' ||
        ')',
        ', '
    ) || ';'
FROM products
WHERE deleted_at IS NULL;

-- Generate INSERT for Product Variants
SELECT 
    'INSERT INTO product_variants (id, product_id, variant_name, sku, price, stock, weight, is_active, attributes, created_at, updated_at) VALUES ' ||
    string_agg(
        '(' || 
        id || ', ' ||
        product_id || ', ' ||
        COALESCE('''' || REPLACE(variant_name, '''', '''''') || '''', 'NULL') || ', ' ||
        '''' || sku || ''', ' ||
        price || ', ' ||
        stock || ', ' ||
        COALESCE(weight::text, 'NULL') || ', ' ||
        is_active || ', ' ||
        COALESCE('''' || REPLACE(attributes::text, '''', '''''') || '''::jsonb', 'NULL') || ', ' ||
        '''' || created_at || ''', ' ||
        '''' || updated_at || '''' ||
        ')',
        ', '
    ) || ';'
FROM product_variants
WHERE deleted_at IS NULL;

-- Generate INSERT for Product Images (with CDN URL update)
SELECT 
    'INSERT INTO product_images (id, product_id, image_url, display_order, created_at, updated_at) VALUES ' ||
    string_agg(
        '(' || 
        id || ', ' ||
        product_id || ', ' ||
        '''' || REPLACE(REPLACE(image_url, '''', ''''''), 'cdn.sparkstage55.com', 'cdn-us.sparkstage55.com') || ''', ' ||
        display_order || ', ' ||
        '''' || created_at || ''', ' ||
        '''' || updated_at || '''' ||
        ')',
        ', '
    ) || ';'
FROM product_images;
