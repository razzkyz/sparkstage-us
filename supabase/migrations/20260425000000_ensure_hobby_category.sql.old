-- ============================================
-- Migration: Ensure Hobby Category Exists
-- Date: 2026-04-25
-- Description: Add Hobby category to categories table
-- ============================================

-- Add Hobby category if it doesn't exist
INSERT INTO public.categories (name, slug, is_active, created_at, updated_at)
VALUES ('Hobby', 'hobby', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;
