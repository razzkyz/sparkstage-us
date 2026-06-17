-- Migration: Assign owner role to owner@gmail.com
-- Date: 2026-06-06

-- Assign owner role to owner@gmail.com
WITH owner_user AS (
  SELECT id FROM auth.users WHERE email = 'owner@gmail.com' LIMIT 1
)
INSERT INTO public.user_role_assignments (user_id, role_name)
SELECT id, 'owner' FROM owner_user
ON CONFLICT (user_id, role_name) DO UPDATE SET updated_at = NOW();
