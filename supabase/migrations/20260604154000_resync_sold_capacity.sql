-- Resync all ticket_availabilities.sold_capacity from actual purchased_tickets count
-- This fixes any data that was out of sync before the trigger was added

UPDATE public.ticket_availabilities ta
SET
  sold_capacity = (
    SELECT COUNT(*)
    FROM public.purchased_tickets pt
    WHERE pt.ticket_id = ta.ticket_id
      AND pt.valid_date = ta.date
      AND to_char(pt.time_slot::time, 'HH24:MI:SS') = ta.time_slot::text
      AND pt.status IN ('active', 'used')
  ),
  updated_at = now()
WHERE true;
