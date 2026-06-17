-- Migration: Update Entrance Ticket Price to 10 (Testing)
-- Date: 2026-05-03
-- Description: Change on-stage entrance ticket price to 10 for testing
-- ============================================

UPDATE public.tickets
SET price = 10,
    updated_at = NOW()
WHERE type = 'entrance';
