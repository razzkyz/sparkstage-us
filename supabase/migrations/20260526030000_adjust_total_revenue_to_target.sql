-- Delete reconciliation tickets to reduce total revenue from Rp 131.065.851 to Rp 122.168.181
-- Need to reduce by: Rp 8.897.670
-- Tickets to delete: 8.897.670 ÷ 85.000 ≈ 105 tickets
-- This will reduce from 1,436 to ~1,331 tickets

DELETE FROM public.purchased_tickets
WHERE ticket_code LIKE 'TKT-REC-%'
  AND status = 'used'
  AND id NOT IN (
    SELECT id FROM public.purchased_tickets
    WHERE ticket_code LIKE 'TKT-REC-%'
      AND status = 'used'
    ORDER BY created_at DESC
    LIMIT 52  -- Keep only 52 reconciliation tickets (1,331 total = 1,279 + 52)
  );

-- Verify final count
SELECT 
  COUNT(*) as total_tickets,
  COUNT(*) * 85000 as ticket_revenue
FROM public.purchased_tickets
WHERE status = 'used';
