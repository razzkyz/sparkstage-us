-- ============================================
-- Migration: Add Sample Dressing Room Products
-- Date: 2026-05-27
-- Description: Add sample dressing room rental products
-- ============================================

-- Insert sample products
INSERT INTO public.dressing_room_products (
  name, description, category, slug, image_url, is_active
) VALUES
  (
    'White Elegant Dress',
    'Elegant white dress perfect for formal events, weddings, and special occasions. Comfortable fit with beautiful details.',
    'clothing',
    'white-elegant-dress',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=600&fit=crop',
    true
  ),
  (
    'Black Formal Gown',
    'Stunning black formal gown with sophisticated design. Ideal for parties, dinners, and evening events.',
    'clothing',
    'black-formal-gown',
    'https://images.unsplash.com/photo-1536882240095-0379873feb4e?w=500&h=600&fit=crop',
    true
  ),
  (
    'Pink Party Dress',
    'Vibrant pink party dress that makes a statement. Perfect for celebrations and social gatherings.',
    'clothing',
    'pink-party-dress',
    'https://images.unsplash.com/photo-1539008588435-666a15acb657?w=500&h=600&fit=crop',
    true
  ),
  (
    'Blue Casual Outfit',
    'Comfortable and stylish blue casual outfit. Great for everyday wear and casual outings.',
    'clothing',
    'blue-casual-outfit',
    'https://images.unsplash.com/photo-1595777707802-221886eb57d3?w=500&h=600&fit=crop',
    true
  ),
  (
    'Red Evening Dress',
    'Bold red evening dress with elegant cut. Perfect for making an impression at formal events.',
    'clothing',
    'red-evening-dress',
    'https://images.unsplash.com/photo-1595696590207-e65e8da4dab8?w=500&h=600&fit=crop',
    true
  );

-- Get the IDs of inserted products for variant creation
WITH inserted_products AS (
  SELECT id, slug FROM public.dressing_room_products 
  WHERE slug IN ('white-elegant-dress', 'black-formal-gown', 'pink-party-dress', 'blue-casual-outfit', 'red-evening-dress')
)

-- Insert all variants (size/color combinations) for each product
INSERT INTO public.dressing_room_product_variants (
  dressing_room_product_id, name, sku, size_label, color,
  price, deposit_amount, daily_rental_fee,
  total_quantity, available_quantity, reserved_quantity,
  damaged_quantity, in_laundry_quantity, is_active
)
SELECT 
  ip.id,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'White Elegant Dress - S'
    WHEN ip.slug = 'black-formal-gown' THEN 'Black Formal Gown - M'
    WHEN ip.slug = 'pink-party-dress' THEN 'Pink Party Dress - L'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'Blue Casual Outfit - M'
    WHEN ip.slug = 'red-evening-dress' THEN 'Red Evening Dress - L'
  END,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'WHITE-DRESS-S'
    WHEN ip.slug = 'black-formal-gown' THEN 'BLACK-GOWN-M'
    WHEN ip.slug = 'pink-party-dress' THEN 'PINK-DRESS-L'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'BLUE-OUTFIT-M'
    WHEN ip.slug = 'red-evening-dress' THEN 'RED-DRESS-L'
  END,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'S'
    WHEN ip.slug = 'black-formal-gown' THEN 'M'
    WHEN ip.slug = 'pink-party-dress' THEN 'L'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'M'
    WHEN ip.slug = 'red-evening-dress' THEN 'L'
  END,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'White'
    WHEN ip.slug = 'black-formal-gown' THEN 'Black'
    WHEN ip.slug = 'pink-party-dress' THEN 'Pink'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'Blue'
    WHEN ip.slug = 'red-evening-dress' THEN 'Red'
  END,
  500000,  -- price: 500k
  150000,  -- deposit: 150k
  50000,   -- daily rate: 50k
  5,       -- total quantity
  5,       -- available quantity
  0,       -- reserved quantity
  0,       -- damaged quantity
  0,       -- in laundry quantity
  true     -- is active
FROM inserted_products ip

UNION ALL

SELECT 
  ip.id,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'White Elegant Dress - M'
    WHEN ip.slug = 'black-formal-gown' THEN 'Black Formal Gown - L'
    WHEN ip.slug = 'pink-party-dress' THEN 'Pink Party Dress - M'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'Blue Casual Outfit - S'
    WHEN ip.slug = 'red-evening-dress' THEN 'Red Evening Dress - M'
  END,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'WHITE-DRESS-M'
    WHEN ip.slug = 'black-formal-gown' THEN 'BLACK-GOWN-L'
    WHEN ip.slug = 'pink-party-dress' THEN 'PINK-DRESS-M'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'BLUE-OUTFIT-S'
    WHEN ip.slug = 'red-evening-dress' THEN 'RED-DRESS-M'
  END,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'M'
    WHEN ip.slug = 'black-formal-gown' THEN 'L'
    WHEN ip.slug = 'pink-party-dress' THEN 'M'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'S'
    WHEN ip.slug = 'red-evening-dress' THEN 'M'
  END,
  CASE 
    WHEN ip.slug = 'white-elegant-dress' THEN 'White'
    WHEN ip.slug = 'black-formal-gown' THEN 'Black'
    WHEN ip.slug = 'pink-party-dress' THEN 'Pink'
    WHEN ip.slug = 'blue-casual-outfit' THEN 'Blue'
    WHEN ip.slug = 'red-evening-dress' THEN 'Red'
  END,
  500000,  -- price: 500k
  150000,  -- deposit: 150k
  50000,   -- daily rate: 50k
  5,       -- total quantity
  5,       -- available quantity
  0,       -- reserved quantity
  0,       -- damaged quantity
  0,       -- in laundry quantity
  true     -- is active
FROM inserted_products ip;
