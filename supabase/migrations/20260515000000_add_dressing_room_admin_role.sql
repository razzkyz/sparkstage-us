-- ============================================
-- Migration: Add Dressing Room Admin Role
-- Date: 2026-05-15
-- Description: Create dressing_room_admin role for limited access
-- ============================================

-- Add new role if not exists
INSERT INTO public.user_role_assignments (user_id, role_name)
SELECT id, 'dressing_room_admin'
FROM auth.users
WHERE email = 'dress@gmail.com'
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE public.user_role_assignments IS 
'Stores user roles - supported roles:
- admin: Full backoffice access
- super_admin: Full system access
- starguide: Ticket scanning only
- kasir: Cashier/sales dashboard (read-only product QR scanning)
- dressing_room_admin: Dressing room/rental management only
';

-- Ensure dressing_room_admin is recognized as admin-level role
-- Update frontend ADMIN_ROLES set if needed to include: dressing_room_admin, retail_admin, ticket_admin
