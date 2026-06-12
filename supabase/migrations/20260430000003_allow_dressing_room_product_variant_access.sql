-- Allow public access to product variants through dressing room lookbooks
-- Even if variants are inactive, they should be accessible if they're part of an active lookbook

-- Add a second policy that allows access via dressing room lookbook joins
create policy product_variants_dressing_room_read
  on public.product_variants
  for select
  to public
  using (
    -- Allow if variant is active, OR
    is_active is true
    OR
    -- Allow if this variant is referenced by an active dressing room lookbook
    EXISTS (
      SELECT 1 FROM public.dressing_room_look_items drli
      JOIN public.dressing_room_looks drl ON drl.id = drli.look_id
      JOIN public.dressing_room_collections drc ON drc.id = drl.collection_id
      WHERE drli.product_variant_id = product_variants.id
      AND drc.is_active = true
    )
  );
