-- Setup Kasir User and Role Assignment
-- Run this in Supabase SQL Editor
-- 
-- Instructions:
-- 1. Create kasir user first via Supabase Dashboard (Authentication → Users → Add user)
--    Email: kasir@gmail.com
--    Password: [choose secure password]
-- 2. Copy the User ID (UUID format)
-- 3. Replace 'PASTE_USER_ID_HERE' below with the actual User ID
-- 4. Run this SQL script

-- Step 1: Assign kasir role to user
INSERT INTO public.user_role_assignments (user_id, role_name, created_at)
VALUES ('PASTE_USER_ID_HERE', 'kasir', NOW())
ON CONFLICT (user_id, role_name) DO NOTHING;

-- Step 2: Verify role was assigned
SELECT ura.user_id, ura.role_name, u.email, u.created_at
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'kasir@gmail.com'
ORDER BY u.created_at DESC;

-- Expected output (if success):
-- user_id | role_name | email          | created_at
-- --------|-----------|----------------|-------------------
-- [UUID] | kasir     | kasir@gmail.com| [timestamp]
