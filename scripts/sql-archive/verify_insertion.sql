-- Verify the 149 tickets were inserted
SELECT 
  COUNT(*) as total_tickets_in_may,
  COUNT(*) * 85000 as total_revenue
FROM public.purchased_tickets
WHERE status = 'used'
  AND CAST(valid_date AS DATE) >= '2026-05-01'
  AND CAST(valid_date AS DATE) <= '2026-05-25';
