-- Fix is_admin() to include devops and other new roles so they don't get 400 Bad Request
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    WHERE ura.user_id = auth.uid()
      AND ura.role_name IN ('admin', 'super_admin', 'super-admin', 'starguide', 'kasir', 'dressing_room_admin', 'ticket_admin', 'retail_admin', 'devops', 'dress')
  )
$$;
