-- ============================================
-- Migration: Venue Reviews
-- Date: 2026-05-08
-- Description: Adds reviews for the venue entrance experience
-- ============================================

-- Create venue_reviews table
CREATE TABLE IF NOT EXISTS public.venue_reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.venue_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public can read approved reviews
CREATE POLICY "Public read access for approved venue_reviews" ON public.venue_reviews
  FOR SELECT USING (is_approved = true);

-- Users can see their own reviews
CREATE POLICY "Users can view their own venue_reviews" ON public.venue_reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create reviews
CREATE POLICY "Users can create their own venue_reviews" ON public.venue_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admin full access for venue_reviews" ON public.venue_reviews
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_venue_reviews_user_id ON public.venue_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_reviews_created_at ON public.venue_reviews(created_at DESC);
