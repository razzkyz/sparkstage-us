-- Create starguide user with limited admin access
-- Email: starguide@gmail.com
-- Password: spark55
-- Role: starguide (access to event-bookings, order-ticket, tickets only)

-- Function to create starguide user and assign role
-- This should be called via Supabase SQL Editor with service role privileges
CREATE OR REPLACE FUNCTION create_starguide_user()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'starguide@gmail.com';
  v_password TEXT := 'spark55';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_user_meta_data,
      created_at,
      updated_at,
      last_sign_in_at,
      raw_app_meta_data
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      '{"name": "Star Guide"}',
      NOW(),
      NOW(),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'
    )
    RETURNING id INTO v_user_id;
  END IF;

  -- Assign starguide role
  INSERT INTO user_role_assignments (user_id, role_name, created_at)
  VALUES (v_user_id, 'starguide', NOW())
  ON CONFLICT (user_id, role_name) DO NOTHING;

  RETURN 'User created/updated with ID: ' || v_user_id;
END;
$$;

-- Call the function to create the user
-- SELECT create_starguide_user();

-- Note: After running this migration, execute the function in Supabase SQL Editor:
-- SELECT create_starguide_user();
