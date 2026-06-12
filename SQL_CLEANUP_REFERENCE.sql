-- SQL Quick Reference untuk Data Cleanup & Validation
-- Use di Supabase SQL Editor atau psql

-- ============================================================
-- 1. IDENTIFY DUMMY DATA
-- ============================================================

-- Dummy Products
SELECT id, name, created_at, (
  SELECT COUNT(*) FROM product_variants WHERE product_id = p.id
) as variant_count
FROM products p
WHERE name ILIKE '%test%' 
   OR name ILIKE '%demo%' 
   OR name ILIKE '%dummy%'
ORDER BY created_at DESC;

-- Dummy Tickets
SELECT id, name, capacity, created_at
FROM tickets
WHERE name ILIKE '%test%' 
   OR name ILIKE '%demo%' 
   OR name ILIKE '%dummy%'
ORDER BY created_at DESC;

-- Test Orders
SELECT id, order_number, customer_name, customer_email, customer_phone, status, created_at
FROM orders
WHERE customer_email ILIKE '%test@%'
   OR customer_email ILIKE '%dummy@%'
   OR customer_email ILIKE '%demo@%'
   OR customer_phone ILIKE '%08888%'
   OR customer_phone ILIKE '%08999%'
ORDER BY created_at DESC;

-- ============================================================
-- 2. VALIDATE PRODUCTION DATA
-- ============================================================

-- Valid Products (without variants)
SELECT p.id, p.name, COUNT(pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON p.id = pv.product_id
WHERE NOT (p.name ILIKE '%test%' OR p.name ILIKE '%demo%' OR p.name ILIKE '%dummy%')
GROUP BY p.id
HAVING COUNT(pv.id) = 0
ORDER BY p.created_at;

-- Valid Tickets
SELECT id, name, capacity, available_capacity, is_active
FROM tickets
WHERE NOT (name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%')
ORDER BY created_at;

-- Orders Missing DOKU Reference
SELECT id, order_number, customer_name, status, created_at
FROM orders
WHERE doku_order_id IS NULL
   AND NOT (customer_email ILIKE '%test@%' OR customer_email ILIKE '%dummy@%' OR customer_email ILIKE '%demo@%')
   AND NOT (customer_phone ILIKE '%08888%' OR customer_phone ILIKE '%08999%')
ORDER BY created_at;

-- ============================================================
-- 3. COUNT SUMMARY (Dummy Data)
-- ============================================================

SELECT 
  (SELECT COUNT(*) FROM products WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%') as dummy_products,
  (SELECT COUNT(*) FROM tickets WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%') as dummy_tickets,
  (SELECT COUNT(*) FROM orders WHERE customer_email ILIKE '%test@%' OR customer_email ILIKE '%dummy@%' OR customer_email ILIKE '%demo@%' OR customer_phone ILIKE '%08888%' OR customer_phone ILIKE '%08999%') as test_orders,
  (SELECT COUNT(*) FROM order_products) as total_order_products;

-- ============================================================
-- 4. CLEANUP SCENARIOS (Manual - use scripts instead!)
-- ============================================================

-- ⚠️ Get dummy product IDs for deletion
WITH dummy_products AS (
  SELECT id FROM products
  WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%'
)
SELECT * FROM dummy_products;

-- ⚠️ Get test order IDs for deletion  
WITH test_orders AS (
  SELECT id FROM orders
  WHERE customer_email ILIKE '%test@%' OR customer_email ILIKE '%dummy@%' OR customer_email ILIKE '%demo@%'
     OR customer_phone ILIKE '%08888%' OR customer_phone ILIKE '%08999%'
)
SELECT * FROM test_orders;

-- ⚠️ Preview order_products that would be deleted
SELECT COUNT(*) as order_products_to_delete
FROM order_products op
WHERE op.product_id IN (
  SELECT id FROM products WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%'
) OR op.order_id IN (
  SELECT id FROM orders WHERE customer_email ILIKE '%test@%' OR customer_email ILIKE '%dummy@%' OR customer_email ILIKE '%demo@%'
);

-- ============================================================
-- 5. USE RPC FUNCTIONS (Recommended!)
-- ============================================================

-- Get summary
SELECT * FROM public.get_dummy_data_summary();

-- Identify dummy products
SELECT * FROM public.identify_dummy_products();

-- Identify test orders
SELECT * FROM public.identify_test_orders();

-- Identify orders without DOKU
SELECT * FROM public.identify_orders_without_doku();

-- ⚠️ EXECUTE CLEANUP (only after backup!)
SELECT * FROM public.cleanup_dummy_data();

-- ============================================================
-- 6. VERIFICATION AFTER CLEANUP
-- ============================================================

-- Check if dummy data is gone
SELECT COUNT(*) as remaining_dummy_products FROM products WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%';
SELECT COUNT(*) as remaining_dummy_tickets FROM tickets WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%';
SELECT COUNT(*) as remaining_test_orders FROM orders WHERE customer_email ILIKE '%test@%' OR customer_email ILIKE '%dummy@%' OR customer_email ILIKE '%demo@%';

-- Check production data still intact
SELECT COUNT(*) as valid_products FROM products WHERE NOT (name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%');
SELECT COUNT(*) as valid_orders FROM orders WHERE NOT (customer_email ILIKE '%test@%' OR customer_email ILIKE '%dummy@%' OR customer_email ILIKE '%demo@%');

-- Check DOKU sync
SELECT COUNT(*) as orders_with_doku FROM orders WHERE doku_order_id IS NOT NULL;
SELECT COUNT(*) as orders_without_doku FROM orders WHERE doku_order_id IS NULL;

-- ============================================================
-- 7. AUDIT LOG (Track cleanup)
-- ============================================================

-- View cleanup audit
SELECT id, event_type, description, changes, created_at 
FROM audit_logs 
WHERE event_type = 'cleanup_dummy_data'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- USAGE NOTES
-- ============================================================

-- Option 1: Use TypeScript scripts (RECOMMENDED)
-- $ npm run data:identify-dummy
-- $ npm run data:validate-production
-- $ npm run data:cleanup-dummy       (dry-run)
-- $ npm run data:cleanup-dummy:confirm (execute)

-- Option 2: Use RPC functions directly in SQL editor
-- SELECT * FROM public.get_dummy_data_summary();
-- SELECT * FROM public.cleanup_dummy_data();  -- ⚠️ Only after backup!

-- Option 3: Use SQL queries directly (NOT RECOMMENDED)
-- Manual queries above, but use scripts instead for better control

-- ============================================================
