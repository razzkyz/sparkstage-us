-- Close booking for May 4-5, 2026 via ticket_availability_overrides
-- This allows customers to see these dates but prevents booking
-- May 6 onwards remains available for booking

-- First, restore the ticket's available_until to allow future bookings
UPDATE public.tickets
SET available_until = '2026-12-31'::date,
    updated_at = NOW()
WHERE type = 'entrance';

-- Then add overrides to close May 4 and May 5 specifically
INSERT INTO public.ticket_availability_overrides (
  ticket_id,
  date,
  time_slot,
  is_closed,
  reason
)
SELECT
  t.id,
  '2026-05-04'::date,
  NULL, -- Close entire day (all time slots)
  true,
  'Maintenance - closed for May 4-5, 2026'
FROM public.tickets t
WHERE t.type = 'entrance';

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
  'Maintenance - closed for May 4-5, 2026'
FROM public.tickets t
WHERE t.type = 'entrance';
