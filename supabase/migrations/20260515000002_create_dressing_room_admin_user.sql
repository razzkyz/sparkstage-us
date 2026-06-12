-- ============================================
-- Migration: Create Dressing Room Admin User
-- Date: 2026-05-15
-- Description: Create dressing_room_admin auth user
-- ============================================

-- Create dressing room admin user
-- Note: This uses Supabase's built-in functions to hash password
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'dress@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      created_at, updated_at, phone, phone_confirmed_at, confirmation_token,
      email_change_token_new, email_change, confirmed_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
      'authenticated', 'dress@gmail.com', extensions.crypt('pin832295', extensions.gen_salt('bf')),
      NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false,
      NOW(), NOW(), NULL, NULL, '', '', '', NOW()
    );
  END IF;
END $$;

-- The role assignment is handled by the previous migration
-- that inserts into user_role_assignments for users with email 'dress@gmail.com'
