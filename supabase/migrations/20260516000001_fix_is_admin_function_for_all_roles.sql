-- ============================================
-- Fix: Update is_admin() function to include all admin roles
-- Date: 2026-05-16
-- Description: Function is_admin() now checks for ALL admin roles including dressing_room_admin
--              This fixes forbidden errors for dressing_room_admin users
-- ============================================

-- Update function in-place (safe – no CASCADE drop needed)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.uid()
      AND ura.role_name IN (
        'admin',
        'super_admin',
        'super-admin',
        'ticket_admin',
        'retail_admin',
        'dressing_room_admin'
      )
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Verify the function works
-- SELECT public.is_admin(); -- Should return true/false based on current user role
