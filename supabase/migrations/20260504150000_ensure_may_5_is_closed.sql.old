-- Ensure May 5, 2026 is closed for booking
-- This fixes the issue where May 5 was still bookable

-- Delete any existing override for May 5 to avoid duplicates
DELETE FROM public.ticket_availability_overrides
WHERE date = '2026-05-05'::date
  AND ticket_id IN (SELECT id FROM public.tickets WHERE type = 'entrance');

-- Re-insert override to ensure May 5 is closed
INSERT INTO public.ticket_availability_overrides (
  ticket_id,
  date,
  time_slot,
  is_closed,
  reason
)
SELECT
  t.id,
  '2026-05-05'::date,
  NULL, -- Close entire day (all time slots)
  true,
  'Maintenance - closed for May 4-5, 2026. Opening May 6, 2026'
FROM public.tickets t
WHERE t.type = 'entrance';
