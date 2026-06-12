-- Audit current revenue (tanggal 1-25)
SELECT 
  'TICKETS' as category,
  COUNT(*) as count,
  COUNT(*) * 85000 as total_revenue
FROM purchased_tickets
WHERE status = 'used'
  AND created_at >= '2026-05-01T00:00:00Z'
  AND created_at <= '2026-05-25T23:59:59Z'

UNION ALL

SELECT 
  'PRODUCTS' as category,
  COUNT(*) as count,
  SUM(total) as total_revenue
FROM order_products
WHERE payment_status = 'paid'
  AND pickup_status = 'completed'
  AND paid_at >= '2026-05-01T00:00:00Z'
  AND paid_at <= '2026-05-25T23:59:59Z'

UNION ALL

SELECT 
  'PRINTS' as category,
  COUNT(*) as count,
  SUM(amount) as total_revenue
FROM print_orders
WHERE status = 'paid'
  AND paid_at >= '2026-05-01T00:00:00Z'
  AND paid_at <= '2026-05-25T23:59:59Z';