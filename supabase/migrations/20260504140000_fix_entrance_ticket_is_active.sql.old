-- Fix entrance ticket is_active to true
-- This fixes the "Ticket inactive: 1" error during payment

UPDATE public.tickets
SET is_active = true,
    updated_at = NOW()
WHERE id = 1 AND type = 'entrance';
