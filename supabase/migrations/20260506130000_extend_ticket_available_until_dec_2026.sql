-- Extend ticket available_until to December 2026
UPDATE public.tickets
SET available_until = '2026-12-31 23:59:59'
WHERE type = 'entrance'
  AND available_until < '2026-12-31 23:59:59';
