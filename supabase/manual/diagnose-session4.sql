-- Diagnose Session 4 availability issue

-- 1. Check current time slots configured
SELECT 
  id,
  name,
  time_slots,
  available_from,
  available_until
FROM public.tickets
WHERE type = 'entrance';

-- 2. Check what time slots actually exist in ticket_availabilities
SELECT DISTINCT time_slot
FROM public.ticket_availabilities
WHERE ticket_id IN (SELECT id FROM public.tickets WHERE type = 'entrance')
ORDER BY time_slot;

-- 3. Count how many availability rows exist per slot for May
SELECT 
  time_slot,
  COUNT(*) as count
FROM public.ticket_availabilities
WHERE ticket_id IN (SELECT id FROM public.tickets WHERE type = 'entrance')
  AND date BETWEEN '2026-05-01' AND '2026-05-31'
GROUP BY time_slot
ORDER BY time_slot;

-- 4. Check if 18:00 exists for any date
SELECT 
  date,
  time_slot,
  total_capacity,
  available_capacity
FROM public.ticket_availabilities
WHERE ticket_id IN (SELECT id FROM public.tickets WHERE type = 'entrance')
  AND time_slot = '18:00'::time
  AND date BETWEEN '2026-05-01' AND '2026-05-31'
ORDER BY date
LIMIT 10;
