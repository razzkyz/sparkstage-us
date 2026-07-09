-- Test cancel_ticket_order_atomic function
-- Run this in Supabase SQL Editor to debug the actual error

-- First, find a pending order to test with
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.user_id,
  oi.ticket_id,
  oi.selected_date,
  oi.selected_time_slots,
  oi.quantity
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'pending'
  AND o.deleted_at IS NULL
  AND oi.deleted_at IS NULL
LIMIT 1;

-- If you have a pending order, test the RPC with:
-- SELECT public.cancel_ticket_order_atomic('ORDER_NUMBER_HERE', 'USER_ID_HERE');

-- Or test directly with a known order:
-- SELECT public.cancel_ticket_order_atomic('ORD123456', '550e8400-e29b-41d4-a716-446655440000');
