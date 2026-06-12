-- ============================================
-- Migration: Backfill Profile Names from auth.users
-- Date: 2026-05-08
-- Description: Update all existing profiles with names from auth.users metadata
-- ============================================

-- Update all profiles with names from auth.users.raw_user_meta_data
UPDATE public.profiles p
SET name = COALESCE(
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p.id),
  p.name,
  (SELECT email FROM auth.users WHERE id = p.id)
)
WHERE name IS NULL OR name = '' OR name = 'Spark User';
