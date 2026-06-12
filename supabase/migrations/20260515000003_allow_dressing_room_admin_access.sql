-- ============================================
-- Migration: Allow Dressing Room Admin Access
-- Date: 2026-05-15
-- Description: Grant dressing_room_admin role access to relevant tables
-- ============================================

-- dressing_room_collections
CREATE POLICY "dressing_room_collections_dra_all"
  ON public.dressing_room_collections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

-- dressing_room_looks
CREATE POLICY "dressing_room_looks_dra_all"
  ON public.dressing_room_looks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

-- dressing_room_look_items
CREATE POLICY "dressing_room_look_items_dra_all"
  ON public.dressing_room_look_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

-- dressing_room_look_photos
CREATE POLICY "dressing_room_look_photos_dra_all"
  ON public.dressing_room_look_photos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

-- order_products
CREATE POLICY "order_products_dra_select"
  ON public.order_products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

CREATE POLICY "order_products_dra_update"
  ON public.order_products FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

-- order_product_items
CREATE POLICY "order_product_items_dra_select"
  ON public.order_product_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

-- profiles
CREATE POLICY "profiles_dra_select"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

-- storage objects
CREATE POLICY "fashion_images_dra_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fashion-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

CREATE POLICY "fashion_images_dra_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fashion-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

CREATE POLICY "fashion_images_dra_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fashion-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );
