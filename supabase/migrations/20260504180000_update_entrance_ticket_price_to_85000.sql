-- Migration: Update Entrance Ticket Price to 85000
-- Date: 2026-05-04
-- Description: Change on-stage entrance ticket price back to 85000 after testing
-- ============================================

UPDATE public.tickets
SET price = 85000,
    updated_at = NOW()
WHERE type = 'entrance';
