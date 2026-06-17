-- ============================================
-- Fix: Add kasir role to is_admin() function
-- Date: 2026-05-19
-- Description: Kasir role should have admin access to view all orders and sales data
-- ============================================

-- Update is_admin() function to include 'kasir' role
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
        'dressing_room_admin',
        'kasir',
        'starguide'
      )
  );
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Verify the function works
-- SELECT public.is_admin(); -- Should return true/false based on current user role
