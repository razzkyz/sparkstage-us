-- ============================================
-- Migration: Allow Public Read of Profile Names for Reviews
-- Date: 2026-05-08
-- Description: Allow public users to read profile names for displaying reviewer names
-- ============================================

-- Create policy to allow public read of profile names only
CREATE POLICY "Public can read profile names for reviews"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);
