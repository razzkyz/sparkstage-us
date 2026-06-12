-- Migration: Add Admin User Queries
-- Date: 2026-05-20

CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (user_id UUID, email VARCHAR, role_name VARCHAR)
SECURITY DEFINER
AS $$
BEGIN
    -- Check if calling user is super_admin or admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_role_assignments.user_id = auth.uid()
        AND user_role_assignments.role_name IN ('super_admin', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT u.id as user_id, u.email::VARCHAR, r.role_name::VARCHAR
    FROM auth.users u
    JOIN public.user_role_assignments r ON u.id = r.user_id
    WHERE r.role_name IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (user_id UUID, email VARCHAR)
SECURITY DEFINER
AS $$
BEGIN
    -- Check if calling user is super_admin or admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_role_assignments.user_id = auth.uid()
        AND user_role_assignments.role_name IN ('super_admin', 'admin')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT u.id as user_id, u.email::VARCHAR
    FROM auth.users u;
END;
$$ LANGUAGE plpgsql;
