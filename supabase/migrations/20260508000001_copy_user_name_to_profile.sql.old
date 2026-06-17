-- ============================================
-- Migration: Copy User Name to Profile
-- Date: 2026-05-08
-- Description: Ensures user name from auth.users is copied to profiles table
-- ============================================

-- Add name column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'name'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN name TEXT;
  END IF;
END $$;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Spark User')
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(NEW.raw_user_meta_data->>'name', profiles.name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing profiles with names from auth.users
UPDATE public.profiles p
SET name = COALESCE(
  (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = p.id),
  p.name
)
WHERE name IS NULL OR name = '';
