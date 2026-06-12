-- Fix RLS policy column scoping issues
-- The previous policies used unqualified column references in EXISTS subqueries,
-- causing "400 Bad Request" errors from PostgREST API

DROP POLICY IF EXISTS "dressing_room_look_items_public_read" ON public.dressing_room_look_items;
DROP POLICY IF EXISTS "dressing_room_looks_public_read" ON public.dressing_room_looks;

CREATE POLICY "dressing_room_look_items_public_read"
  ON public.dressing_room_look_items FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.dressing_room_looks dl
      JOIN public.dressing_room_collections dc ON dc.id = dl.collection_id
      WHERE dl.id = dressing_room_look_items.look_id AND dc.is_active = true
    )
  );

CREATE POLICY "dressing_room_looks_public_read"
  ON public.dressing_room_looks FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.dressing_room_collections dc
      WHERE dc.id = dressing_room_looks.collection_id AND dc.is_active = true
    )
  );
