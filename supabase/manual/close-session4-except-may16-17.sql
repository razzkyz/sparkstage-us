-- Close Session 4 (18:00) for all dates except May 16-17, 2026
-- This allows booking only on May 16 and 17 for the 18:00 session
-- Safety: Only close dates with no existing bookings

-- First, delete any existing overrides for session 4 (18:00)
DELETE FROM public.ticket_availability_overrides
WHERE ticket_id IN (SELECT id FROM public.tickets WHERE type = 'entrance')
  AND time_slot = '18:00'::time
  AND date BETWEEN '2026-05-01' AND '2026-05-31';

-- Close 18:00 session for dates BEFORE May 16 (only if no bookings exist)
INSERT INTO public.ticket_availability_overrides (
  ticket_id,
  date,
  time_slot,
  is_closed,
  reason,
  created_at,
  updated_at
)
SELECT
  t.id,
  d.date,
  '18:00'::time,
  true,
  'Session 4 (18:00) closed - only available May 16-17',
  NOW(),
  NOW()
FROM public.tickets t
CROSS JOIN (
  -- Generate all dates from May 1 to May 15, 2026
  SELECT generate_series('2026-05-01'::date, '2026-05-15'::date, '1 day'::interval)::date AS date
) d
LEFT JOIN public.ticket_availabilities ta 
  ON ta.ticket_id = t.id 
  AND ta.date = d.date 
  AND ta.time_slot = '18:00'::time
WHERE t.type = 'entrance'
  AND (ta.reserved_capacity = 0 AND ta.sold_capacity = 0);

-- Close 18:00 session for dates AFTER May 17 (only if no bookings exist)
INSERT INTO public.ticket_availability_overrides (
  ticket_id,
  date,
  time_slot,
  is_closed,
  reason,
  created_at,
  updated_at
)
SELECT
  t.id,
  d.date,
  '18:00'::time,
  true,
  'Session 4 (18:00) closed - only available May 16-17',
  NOW(),
  NOW()
FROM public.tickets t
CROSS JOIN (
  -- Generate all dates from May 18 to May 31, 2026
  SELECT generate_series('2026-05-18'::date, '2026-05-31'::date, '1 day'::interval)::date AS date
) d
LEFT JOIN public.ticket_availabilities ta 
  ON ta.ticket_id = t.id 
  AND ta.date = d.date 
  AND ta.time_slot = '18:00'::time
WHERE t.type = 'entrance'
  AND (ta.reserved_capacity = 0 AND ta.sold_capacity = 0);

-- Verify: Check overrides for 18:00 slot in May
SELECT 
  date,
  time_slot,
  is_closed,
  reason
FROM public.ticket_availability_overrides
WHERE date BETWEEN '2026-05-01' AND '2026-05-31'
  AND time_slot = '18:00'::time
ORDER BY date;
