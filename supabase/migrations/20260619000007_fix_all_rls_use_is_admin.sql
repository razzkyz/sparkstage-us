-- Comprehensive RLS Fix: Replace all direct user_role_assignments queries with is_admin()
-- This ensures consistency and includes all admin roles (admin, super_admin, owner, devops)

-- ============================================
-- FIX: Product Images RLS
-- ============================================

DROP POLICY IF EXISTS "Admin can insert product images" ON public.product_images;
DROP POLICY IF EXISTS "Admin can update product images" ON public.product_images;
DROP POLICY IF EXISTS "Admin can delete product images" ON public.product_images;

CREATE POLICY "Admins can insert product images"
  ON public.product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update product images"
  ON public.product_images
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete product images"
  ON public.product_images
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================
-- FIX: CMS Page Settings RLS
-- ============================================

-- News Page Settings
DROP POLICY IF EXISTS "Only admins can update news page settings" ON public.news_page_settings;

CREATE POLICY "Admins can update news page settings"
  ON public.news_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Event Page Settings
DROP POLICY IF EXISTS "Only admins can update event page settings" ON public.event_page_settings;

CREATE POLICY "Admins can update event page settings"
  ON public.event_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Charm Bar Page Settings
DROP POLICY IF EXISTS "Only admins can update charm bar page settings" ON public.charm_bar_page_settings;

CREATE POLICY "Admins can update charm bar page settings"
  ON public.charm_bar_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- GLAM Page Settings
DROP POLICY IF EXISTS "Only admins can update glam page settings" ON public.glam_page_settings;

CREATE POLICY "Admins can update glam page settings"
  ON public.glam_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
