-- Fix dressing room RLS policies with simplified logic
-- Avoid complex nested JOINs in EXISTS subqueries which cause PostgREST issues

DROP POLICY IF EXISTS "dressing_room_look_items_public_read" ON public.dressing_room_look_items;
DROP POLICY IF EXISTS "dressing_room_look_items_public_select" ON public.dressing_room_look_items;
DROP POLICY IF EXISTS "dressing_room_looks_public_read" ON public.dressing_room_looks;
DROP POLICY IF EXISTS "dressing_room_looks_public_select" ON public.dressing_room_looks;
DROP POLICY IF EXISTS "dressing_room_collections_public_read" ON public.dressing_room_collections;
DROP POLICY IF EXISTS "dressing_room_collections_public_select" ON public.dressing_room_collections;

-- Dressing room look items: Always allow public SELECT
-- (Application layer filters for active collections)
CREATE POLICY "dressing_room_look_items_public_select"
  ON public.dressing_room_look_items FOR SELECT TO public
  USING (true);

-- Dressing room looks: Always allow public SELECT
-- (Application layer filters for active collections)
CREATE POLICY "dressing_room_looks_public_select"
  ON public.dressing_room_looks FOR SELECT TO public
  USING (true);

-- Dressing room collections: Only allow active ones
CREATE POLICY "dressing_room_collections_public_select"
  ON public.dressing_room_collections FOR SELECT TO public
  USING (is_active = true);
