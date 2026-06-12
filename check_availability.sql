-- Check ticket available_from and available_until dates
SELECT id, name, type, available_from, available_until
FROM public.tickets
WHERE type = 'entrance';

-- Check if availability data exists for July-December 2026
SELECT date, COUNT(*) as slot_count
FROM public.ticket_availabilities
WHERE date >= '2026-07-01' AND date <= '2026-12-31'
GROUP BY date
ORDER BY date
LIMIT 20;
