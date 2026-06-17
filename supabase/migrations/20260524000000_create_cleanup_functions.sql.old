-- Migration: Create Safe Cleanup Functions for Dummy Data
-- Date: 2026-05-24
-- Description: RPC functions to identify dummy products/tickets/orders

CREATE OR REPLACE FUNCTION public.get_dummy_data_summary()
RETURNS TABLE (
  dummy_product_count INTEGER,
  dummy_ticket_count INTEGER,
  test_order_count INTEGER
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    (SELECT COUNT(*) FROM products WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%'),
    (SELECT COUNT(*) FROM tickets WHERE name ILIKE '%test%' OR name ILIKE '%demo%' OR name ILIKE '%dummy%'),
    (SELECT COUNT(*) FROM orders WHERE customer_email ILIKE '%test@%' OR customer_email ILIKE '%dummy@%' OR customer_email ILIKE '%demo@%' OR customer_phone ILIKE '%08888%' OR customer_phone ILIKE '%08999%')
$$;

CREATE OR REPLACE FUNCTION public.identify_dummy_products()
RETURNS TABLE (
  id BIGINT,
  name TEXT,
  description TEXT,
  dummy_reason TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    p.id,
    p.name,
    p.description,
    CASE 
      WHEN p.name ILIKE '%test%' THEN 'Name contains TEST'
      WHEN p.name ILIKE '%demo%' THEN 'Name contains DEMO'
      WHEN p.name ILIKE '%dummy%' THEN 'Name contains DUMMY'
      ELSE 'Unknown'
    END as dummy_reason
  FROM products p
  WHERE p.name ILIKE '%test%' OR p.name ILIKE '%demo%' OR p.name ILIKE '%dummy%'
$$;

CREATE OR REPLACE FUNCTION public.identify_test_orders()
RETURNS TABLE (
  id BIGINT,
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  test_reason TEXT
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT 
    o.id,
    o.order_number,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.status,
    o.created_at,
    CASE 
      WHEN o.customer_email ILIKE '%test@%' THEN 'Email contains TEST'
      WHEN o.customer_email ILIKE '%dummy@%' THEN 'Email contains DUMMY'
      WHEN o.customer_email ILIKE '%demo@%' THEN 'Email contains DEMO'
      WHEN o.customer_phone ILIKE '%08888%' THEN 'Phone contains 08888'
      WHEN o.customer_phone ILIKE '%08999%' THEN 'Phone contains 08999'
      ELSE 'Unknown'
    END as test_reason
  FROM orders o
  WHERE o.customer_email ILIKE '%test@%' 
     OR o.customer_email ILIKE '%dummy@%'
     OR o.customer_email ILIKE '%demo@%'
     OR o.customer_phone ILIKE '%08888%'
     OR o.customer_phone ILIKE '%08999%'
$$;

GRANT EXECUTE ON FUNCTION public.get_dummy_data_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.identify_dummy_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.identify_test_orders() TO authenticated;
