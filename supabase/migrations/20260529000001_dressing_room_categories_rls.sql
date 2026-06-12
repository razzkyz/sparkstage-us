-- ============================================
-- Migration: Enable RLS on dressing_room_categories
-- Date: 2026-05-29
-- Description: Enable RLS and add public read policy so frontend can fetch categories
-- ============================================

ALTER TABLE public.dressing_room_categories ENABLE ROW LEVEL SECURITY;

-- Public: Read active categories
CREATE POLICY "Public read active dressing_room_categories" ON public.dressing_room_categories
  FOR SELECT USING (is_active = true);

-- Admin: Full access
CREATE POLICY "Admin full access dressing_room_categories" ON public.dressing_room_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
