-- ============================================
-- Migration: Update Entrance Ticket Price to 85.000
-- Date: 2026-04-30
-- Description: Change on-stage entrance ticket price from 100.000 to 85.000
-- ============================================

UPDATE public.tickets
SET price = 85000,
    updated_at = NOW()
WHERE type = 'entrance';
