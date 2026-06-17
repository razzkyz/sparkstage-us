-- Temporarily disable entrance ticket until May 5th, 2026
-- This sets available_until to end of May 5th, so ticket will be unavailable on May 5th
-- and can be re-enabled on May 6th by updating available_until

UPDATE public.tickets
SET available_until = '2026-05-05'::date,
    updated_at = NOW()
WHERE type = 'entrance';
