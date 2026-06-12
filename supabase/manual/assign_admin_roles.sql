-- ============================================
-- Manual Role Assignment for Admin Users
-- Date: 2026-05-15
-- Description: Assign admin@gmail.com dan kasir@gmail.com to their roles
-- ============================================

-- First, check if users exist
SELECT id, email FROM auth.users WHERE email IN ('admin@gmail.com', 'kasir@gmail.com');

-- Assign admin role
INSERT INTO public.user_role_assignments (user_id, role_name)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@gmail.com'
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Assign kasir role
INSERT INTO public.user_role_assignments (user_id, role_name)
SELECT id, 'kasir'
FROM auth.users
WHERE email = 'kasir@gmail.com'
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Verify assignment
SELECT u.email, r.role_name 
FROM auth.users u
LEFT JOIN public.user_role_assignments r ON u.id = r.user_id
WHERE u.email IN ('admin@gmail.com', 'kasir@gmail.com');
