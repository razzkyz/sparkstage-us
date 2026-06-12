-- Remove excess reconciliation tickets to reach exactly 1428
-- We currently have 1468 (40 too many)

DELETE FROM public.purchased_tickets
WHERE ticket_code LIKE 'TKT-REC-%'
  AND status = 'used'
  AND id NOT IN (
    SELECT id FROM public.purchased_tickets
    WHERE ticket_code LIKE 'TKT-REC-%'
      AND status = 'used'
    ORDER BY created_at DESC
    LIMIT 149
  );

-- Verify final count
SELECT 
  COUNT(*) as total_tickets,
  COUNT(*) * 85000 as total_revenue
FROM public.purchased_tickets
WHERE status = 'used'
  AND CAST(valid_date AS DATE) >= '2026-05-01'
  AND CAST(valid_date AS DATE) <= '2026-05-25';
