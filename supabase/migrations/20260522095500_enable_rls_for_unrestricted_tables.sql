-- Enable RLS on rate_limit_logs
-- No policies added means it defaults to deny all for client API access.
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on divisions
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "divisions_read_authenticated" ON public.divisions;
CREATE POLICY "divisions_read_authenticated" ON public.divisions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "divisions_insert_super_admin" ON public.divisions;
CREATE POLICY "divisions_insert_super_admin" ON public.divisions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "divisions_update_super_admin" ON public.divisions;
CREATE POLICY "divisions_update_super_admin" ON public.divisions
    FOR UPDATE TO authenticated
    USING (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "divisions_delete_super_admin" ON public.divisions;
CREATE POLICY "divisions_delete_super_admin" ON public.divisions
    FOR DELETE TO authenticated
    USING (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name = 'super_admin'
        )
    );

-- Enable RLS on admin_divisions
ALTER TABLE public.admin_divisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_divisions_read_admin" ON public.admin_divisions;
CREATE POLICY "admin_divisions_read_admin" ON public.admin_divisions
    FOR SELECT TO authenticated
    USING (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "admin_divisions_insert_super_admin" ON public.admin_divisions;
CREATE POLICY "admin_divisions_insert_super_admin" ON public.admin_divisions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "admin_divisions_update_super_admin" ON public.admin_divisions;
CREATE POLICY "admin_divisions_update_super_admin" ON public.admin_divisions
    FOR UPDATE TO authenticated
    USING (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "admin_divisions_delete_super_admin" ON public.admin_divisions;
CREATE POLICY "admin_divisions_delete_super_admin" ON public.admin_divisions
    FOR DELETE TO authenticated
    USING (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name = 'super_admin'
        )
    );
