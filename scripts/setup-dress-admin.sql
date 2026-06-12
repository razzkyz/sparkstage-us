-- ============================================
-- Setup Dressing Room Admin for dress@gmail.com
-- ============================================
-- This script assigns the dressing_room_admin role to dress@gmail.com user

-- 1️⃣ Find the user ID by email
SELECT id, email FROM auth.users WHERE email = 'dress@gmail.com';

-- 2️⃣ Assign dressing_room_admin role (replace {USER_ID} with the UUID from step 1)
-- Copy the ID from the result above and replace {USER_ID} below
INSERT INTO public.user_role_assignments (user_id, role_name)
VALUES ('{USER_ID}', 'dressing_room_admin')
ON CONFLICT (user_id, role_name) DO NOTHING;

-- 3️⃣ Verify the role was assigned
SELECT ura.user_id, ura.role_name, u.email
FROM public.user_role_assignments ura
JOIN auth.users u ON u.id = ura.user_id
WHERE u.email = 'dress@gmail.com';

-- 4️⃣ Check if user can access dressing room data (test after role is assigned)
-- This will show if RLS policies allow the user to see dressing room tables
-- SELECT * FROM public.dressing_room_collections LIMIT 1;
-- SELECT * FROM public.products LIMIT 1;
-- SELECT * FROM public.rental_orders LIMIT 1;
