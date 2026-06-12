-- ============================================
-- Shipping Integration - Quick Test Queries
-- Date: 2026-06-10
-- Usage: Run these in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. PRE-FLIGHT CHECKS
-- ============================================

-- Check if migration columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'order_products'
  AND column_name IN (
    'shipping_address',
    'shipping_province_id',
    'shipping_city_id',
    'shipping_subdistrict_id',
    'shipping_courier',
    'shipping_service',
    'tracking_number',
    'shipped_at',
    'estimated_delivery_date'
  )
ORDER BY column_name;

-- Should return 9 rows, all nullable = YES
-- ✅ If 9 rows: Migration successful
-- ❌ If 0 rows: Migration not run yet


-- Check existing orders unaffected
SELECT 
  order_number,
  payment_status,
  shipping_courier,
  shipping_cost,
  total,
  created_at
FROM order_products
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- Old orders should have shipping_courier = NULL
-- ✅ If NULLs exist: Backward compatible


-- ============================================
-- 2. FIND YOUR TEST ORDERS
-- ============================================

-- Find pickup orders (no shipping)
SELECT 
  order_number,
  payment_status,
  pickup_status,
  subtotal,
  shipping_cost,
  total,
  created_at
FROM order_products
WHERE shipping_courier IS NULL
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;


-- Find shipping orders (with delivery)
SELECT 
  order_number,
  shipping_courier,
  shipping_service,
  shipping_cost,
  LEFT(shipping_address, 80) as address,
  payment_status,
  tracking_number,
  created_at
FROM order_products
WHERE shipping_courier IS NOT NULL
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 5;


-- ============================================
-- 3. DETAILED ORDER INSPECTION
-- ============================================

-- Replace 'PRD-XXXXX' with your actual order number
-- View complete shipping details
SELECT 
  order_number,
  user_id,
  channel,
  status,
  payment_status,
  
  -- Pricing
  subtotal,
  discount_amount,
  shipping_cost,
  total,
  
  -- Shipping Info
  shipping_courier,
  shipping_service,
  shipping_address,
  shipping_province_id,
  shipping_city_id,
  shipping_subdistrict_id,
  
  -- Fulfillment
  tracking_number,
  shipped_at,
  pickup_status,
  
  -- Timestamps
  created_at,
  updated_at,
  payment_expired_at
  
FROM order_products
WHERE order_number = 'PRD-XXXXX'; -- REPLACE THIS


-- ============================================
-- 4. VALIDATION CHECKS
-- ============================================

-- Check total calculation is correct
-- Total should equal: subtotal - discount + shipping
SELECT 
  order_number,
  subtotal,
  discount_amount,
  shipping_cost,
  total,
  (subtotal - COALESCE(discount_amount, 0) + COALESCE(shipping_cost, 0)) as calculated_total,
  total = (subtotal - COALESCE(discount_amount, 0) + COALESCE(shipping_cost, 0)) as is_correct
FROM order_products
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- ✅ is_correct should be TRUE for all orders


-- Check shipping data consistency
-- Orders with courier MUST have shipping_cost > 0
SELECT 
  order_number,
  shipping_courier,
  shipping_cost,
  CASE 
    WHEN shipping_courier IS NOT NULL AND shipping_cost = 0 THEN '❌ Missing shipping cost'
    WHEN shipping_courier IS NULL AND shipping_cost > 0 THEN '❌ Pickup with shipping cost'
    ELSE '✅ Valid'
  END as validation_status
FROM order_products
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 20;

-- All should show ✅ Valid


-- ============================================
-- 5. SHIPPING ORDERS NEEDING FULFILLMENT
-- ============================================

-- Orders that need to be shipped (admin todo list)
SELECT 
  order_number,
  shipping_courier,
  shipping_service,
  shipping_cost,
  LEFT(shipping_address, 60) as address,
  payment_status,
  EXTRACT(HOUR FROM (NOW() - created_at)) as hours_since_order
FROM order_products
WHERE payment_status = 'paid'
  AND shipping_courier IS NOT NULL
  AND tracking_number IS NULL
  AND status NOT IN ('cancelled', 'expired')
ORDER BY created_at ASC;

-- These orders are waiting for resi input


-- ============================================
-- 6. SHIPPED ORDERS TRACKING
-- ============================================

-- Orders that have been shipped
SELECT 
  order_number,
  shipping_courier,
  tracking_number,
  shipped_at,
  status,
  EXTRACT(DAY FROM (NOW() - shipped_at)) as days_since_shipped
FROM order_products
WHERE tracking_number IS NOT NULL
ORDER BY shipped_at DESC
LIMIT 20;


-- ============================================
-- 7. STATISTICS & ANALYTICS
-- ============================================

-- Order breakdown by method (pickup vs shipping)
SELECT 
  CASE 
    WHEN shipping_courier IS NULL THEN 'Pickup'
    ELSE 'Delivery'
  END as order_method,
  COUNT(*) as total_orders,
  SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
  AVG(CASE WHEN payment_status = 'paid' THEN total ELSE NULL END) as avg_order_value,
  SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) as total_revenue
FROM order_products
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY order_method
ORDER BY order_method;


-- Shipping cost analysis by courier
SELECT 
  shipping_courier,
  shipping_service,
  COUNT(*) as order_count,
  AVG(shipping_cost) as avg_shipping_cost,
  MIN(shipping_cost) as min_cost,
  MAX(shipping_cost) as max_cost,
  SUM(shipping_cost) as total_shipping_revenue
FROM order_products
WHERE shipping_courier IS NOT NULL
  AND payment_status = 'paid'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY shipping_courier, shipping_service
ORDER BY order_count DESC;


-- Shipping performance (how fast orders are shipped)
SELECT 
  shipping_courier,
  COUNT(*) as shipped_orders,
  AVG(EXTRACT(HOUR FROM (shipped_at - created_at))) as avg_hours_to_ship,
  MIN(EXTRACT(HOUR FROM (shipped_at - created_at))) as fastest_ship_hours,
  MAX(EXTRACT(HOUR FROM (shipped_at - created_at))) as slowest_ship_hours
FROM order_products
WHERE tracking_number IS NOT NULL
  AND shipped_at IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY shipping_courier
ORDER BY avg_hours_to_ship ASC;


-- ============================================
-- 8. CUSTOMER VIEW - FIND USER ORDERS
-- ============================================

-- Replace with actual user_id to see their orders
SELECT 
  order_number,
  CASE 
    WHEN shipping_courier IS NULL THEN 'Pickup'
    ELSE shipping_courier || ' ' || COALESCE(shipping_service, '')
  END as delivery_method,
  total,
  payment_status,
  status,
  tracking_number,
  created_at
FROM order_products
WHERE user_id = 'YOUR_USER_ID' -- REPLACE THIS
ORDER BY created_at DESC
LIMIT 10;


-- ============================================
-- 9. TROUBLESHOOTING QUERIES
-- ============================================

-- Find orders with suspicious data
-- (shipping cost but no courier, or vice versa)
SELECT 
  order_number,
  shipping_courier,
  shipping_service,
  shipping_cost,
  shipping_address,
  created_at,
  '⚠️ Inconsistent data' as issue
FROM order_products
WHERE (
  (shipping_courier IS NOT NULL AND shipping_cost = 0)
  OR (shipping_courier IS NULL AND shipping_cost > 0)
  OR (shipping_courier IS NOT NULL AND shipping_address IS NULL)
)
AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;


-- Find orders stuck in processing
SELECT 
  order_number,
  payment_status,
  status,
  shipping_courier,
  tracking_number,
  EXTRACT(HOUR FROM (NOW() - created_at)) as hours_old,
  created_at
FROM order_products
WHERE payment_status = 'paid'
  AND status NOT IN ('completed', 'cancelled', 'expired')
  AND created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC;


-- ============================================
-- 10. CLEANUP (USE WITH CAUTION!)
-- ============================================

-- Delete test orders (ONLY IN DEVELOPMENT!)
-- UNCOMMENT ONLY IF YOU'RE SURE!

-- DELETE FROM order_product_items
-- WHERE order_product_id IN (
--   SELECT id FROM order_products
--   WHERE order_number LIKE 'PRD-TEST%'
-- );

-- DELETE FROM order_products
-- WHERE order_number LIKE 'PRD-TEST%';


-- ============================================
-- 11. QUICK REFERENCE - Common Queries
-- ============================================

-- Today's shipping orders
SELECT COUNT(*) as today_shipping_orders
FROM order_products
WHERE DATE(created_at) = CURRENT_DATE
  AND shipping_courier IS NOT NULL;

-- Pending shipments count
SELECT COUNT(*) as pending_shipments
FROM order_products
WHERE payment_status = 'paid'
  AND shipping_courier IS NOT NULL
  AND tracking_number IS NULL;

-- Shipped today count
SELECT COUNT(*) as shipped_today
FROM order_products
WHERE DATE(shipped_at) = CURRENT_DATE;

-- Total shipping revenue this month
SELECT 
  SUM(shipping_cost) as total_shipping_revenue,
  COUNT(*) as total_shipping_orders
FROM order_products
WHERE shipping_courier IS NOT NULL
  AND payment_status = 'paid'
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())
  AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM NOW());


-- ============================================
-- END OF TEST QUERIES
-- ============================================
