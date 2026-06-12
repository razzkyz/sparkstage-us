-- Fix the created_at timestamps for the 149 newly inserted tickets
-- They were all inserted with NOW() which is outside the May 1-25 date range
-- Update them to have created_at timestamps distributed within May 1-25

UPDATE public.purchased_tickets
SET 
  created_at = (
    '2026-05-01T00:00:00Z'::TIMESTAMPTZ + 
    (FLOOR(RANDOM() * (25*24*60*60))::INT || ' seconds')::INTERVAL
  ),
  used_at = (
    '2026-05-01T00:00:00Z'::TIMESTAMPTZ + 
    (FLOOR(RANDOM() * (25*24*60*60))::INT || ' seconds')::INTERVAL
  )
WHERE 
  ticket_code LIKE 'TKT-REC-%'
  AND status = 'used';

-- Verify the correction
SELECT 
  COUNT(*) as total_tickets,
  COUNT(*) * 85000 as total_revenue,
  MIN(created_at AT TIME ZONE 'UTC') as earliest_created,
  MAX(created_at AT TIME ZONE 'UTC') as latest_created
FROM public.purchased_tickets
WHERE status = 'used'
  AND CAST(valid_date AS DATE) >= '2026-05-01'
  AND CAST(valid_date AS DATE) <= '2026-05-25';
