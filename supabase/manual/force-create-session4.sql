-- Force create Session 4 (18:00) availability for ALL May dates
-- This bypasses the need for regenerate, just directly creates the rows

-- 1. First ensure tickets table has 18:00 in time_slots
UPDATE public.tickets
SET time_slots = CASE 
  WHEN time_slots::text LIKE '%18:00%' THEN time_slots
  ELSE to_json((SELECT array_append(array_agg(t.value), '18:00') FROM json_array_elements_text(time_slots) t(value)))
END
WHERE type = 'entrance';

-- 2. Delete existing 18:00 slots for May (clean slate)
DELETE FROM public.ticket_availabilities
WHERE ticket_id IN (SELECT id FROM public.tickets WHERE type = 'entrance')
  AND time_slot = '18:00'::time
  AND date BETWEEN '2026-05-01' AND '2026-05-31';

-- 3. Get the default capacity from settings
-- SELECT default_slot_capacity FROM public.ticket_booking_settings LIMIT 1;

-- 4. Insert 18:00 availability for ALL May dates
INSERT INTO public.ticket_availabilities (
  ticket_id,
  date,
  time_slot,
  total_capacity,
  reserved_capacity,
  sold_capacity,
  version,
  created_at,
  updated_at
)
SELECT
  t.id,
  d.date,
  '18:00'::time,
  COALESCE(s.default_slot_capacity, 30),
  0,
  0,
  0,
  NOW(),
  NOW()
FROM public.tickets t
CROSS JOIN (
  SELECT generate_series('2026-05-01'::date, '2026-05-31'::date, '1 day'::interval)::date AS date
) d
LEFT JOIN public.ticket_booking_settings s ON s.ticket_id = t.id
WHERE t.type = 'entrance'
ON CONFLICT DO NOTHING;

-- 5. Verify: Show all 18:00 slots now exist
SELECT 
  COUNT(*) as total_18_slots,
  COUNT(DISTINCT date) as dates_with_18_slots
FROM public.ticket_availabilities
WHERE ticket_id IN (SELECT id FROM public.tickets WHERE type = 'entrance')
  AND time_slot = '18:00'::time
  AND date BETWEEN '2026-05-01' AND '2026-05-31';
