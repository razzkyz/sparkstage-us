-- ============================================
-- Migration: Allow Dressing Room Admin Products Access
-- Date: 2026-05-15
-- Description: Grant dressing_room_admin access to store features like products, categories, vouchers
-- ============================================

-- products
CREATE POLICY "products_dra_all"
  ON public.products FOR ALL TO authenticated
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

-- product_variants
CREATE POLICY "product_variants_dra_all"
  ON public.product_variants FOR ALL TO authenticated
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

-- categories
CREATE POLICY "categories_dra_all"
  ON public.categories FOR ALL TO authenticated
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

-- vouchers
CREATE POLICY "vouchers_dra_all"
  ON public.vouchers FOR ALL TO authenticated
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

-- storage objects for product images
CREATE POLICY "product_images_dra_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

CREATE POLICY "product_images_dra_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );

CREATE POLICY "product_images_dra_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'dressing_room_admin'
    )
  );
