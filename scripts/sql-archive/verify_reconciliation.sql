-- Verify the ticket count and timestamps
SELECT 
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE ticket_code LIKE 'TKT-REC-%') as reconciliation_tickets,
  MIN(created_at AT TIME ZONE 'UTC') as earliest_created,
  MAX(created_at AT TIME ZONE 'UTC') as latest_created,
  COUNT(DISTINCT DATE(created_at AT TIME ZONE 'UTC')) as unique_dates
FROM public.purchased_tickets
WHERE status = 'used'
  AND CAST(valid_date AS DATE) >= '2026-05-01'
  AND CAST(valid_date AS DATE) <= '2026-05-25';
