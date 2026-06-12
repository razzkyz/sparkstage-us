-- Allow public access to products through dressing room lookbooks
-- Even if products are inactive/deleted, they should be accessible if they're part of an active lookbook

create policy products_dressing_room_read
  on public.products
  for select
  to public
  using (
    -- Allow if product is active and not deleted, OR
    ((is_active is true) and (deleted_at is null))
    OR
    -- Allow if this product is referenced by a product variant in an active dressing room lookbook
    EXISTS (
      SELECT 1 FROM public.product_variants pv
      JOIN public.dressing_room_look_items drli ON drli.product_variant_id = pv.id
      JOIN public.dressing_room_looks drl ON drl.id = drli.look_id
      JOIN public.dressing_room_collections drc ON drc.id = drl.collection_id
      WHERE pv.product_id = products.id
      AND drc.is_active = true
    )
  );
