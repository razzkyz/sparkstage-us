-- Migration: Add Kasir Role Support
-- Date: 2026-05-15
-- Description: Add kasir (cashier) role for read-only sales dashboard access

-- Insert kasir role example (optional - replace with actual kasir user email)
-- This is a template. Replace 'kasir@spark.local' with actual kasir email from Supabase Auth
-- DO NOT run this automatically - need manual setup

-- UPDATE: After running this migration, you need to:
-- 1. Create kasir user in Supabase Auth (or use existing user)
-- 2. Run this function call to assign kasir role:
-- SELECT assign_kasir_role('USER_UUID_HERE');

CREATE OR REPLACE FUNCTION public.assign_kasir_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Check if role already exists for this user
  SELECT COUNT(*) INTO v_count
  FROM user_role_assignments
  WHERE user_id = $1 AND role_name = 'kasir';

  IF v_count > 0 THEN
    RETURN 'Kasir role already assigned to user: ' || $1;
  END IF;

  -- Assign kasir role
  INSERT INTO user_role_assignments (user_id, role_name, created_at)
  VALUES ($1, 'kasir', NOW())
  ON CONFLICT (user_id, role_name) DO NOTHING;

  RETURN 'Kasir role assigned to user: ' || $1;
END;
$$;

-- Note: Kasir role has read-only access to:
-- - Sales dashboard (tickets + products)
-- - Product order lookup/search
-- - Product QR scanning
-- - Cannot modify any data

-- RLS Policy for kasir role (read-only access to orders and order_product_items)
-- These policies already exist and cover kasir access via is_admin() function
