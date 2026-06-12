-- Add owner SELECT policy for stock_opname tables
-- Owner role can view but not create/update/delete

-- Drop existing owner policy if exists
DROP POLICY IF EXISTS "Owner can view stock opname" ON public.stock_opname;

-- Create new owner policy for SELECT only
CREATE POLICY "Owner can view stock opname" ON public.stock_opname
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin', 'super_admin')
    )
  );

-- Also add for stock_opname_items
DROP POLICY IF EXISTS "Owner can view stock opname items" ON public.stock_opname_items;

CREATE POLICY "Owner can view stock opname items" ON public.stock_opname_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
      AND role_name IN ('owner', 'admin', 'super_admin')
    )
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
