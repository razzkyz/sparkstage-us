-- Fix entrance ticket availability window
-- Ticket should be bookable on May 4th and 5th (full day WIB), then closed from May 6th onward.
-- Previous migration set available_until = '2026-05-05'::date which resolves to
-- 2026-05-05 00:00:00 UTC, causing the ticket to expire at 07:00 WIB on May 5th.
-- This migration corrects it to end-of-day May 5th WIB (2026-05-05 23:59:59+07).

UPDATE public.tickets
SET available_until = '2026-05-05 23:59:59+07'::timestamptz,
    updated_at = NOW()
WHERE type = 'entrance';
