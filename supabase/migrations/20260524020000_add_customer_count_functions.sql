-- Add function to get accurate total customer count
-- Counts all users registered via email or Google OAuth

CREATE OR REPLACE FUNCTION get_total_registered_customers_count()
RETURNS TABLE (total_count BIGINT)
SECURITY DEFINER
AS $$
BEGIN
    -- Check if calling user is admin, super_admin, devops, or kasir
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_role_assignments.user_id = auth.uid()
        AND user_role_assignments.role_name IN ('super_admin', 'admin', 'devops', 'kasir', 'dressing_room_admin', 'starguide')
    ) THEN
        RAISE EXCEPTION 'Access denied: insufficient permissions';
    END IF;

    RETURN QUERY
    SELECT COUNT(u.id)::BIGINT
    FROM auth.users u
    WHERE u.email IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Grants for the new function
GRANT EXECUTE ON FUNCTION get_total_registered_customers_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_total_registered_customers_count() TO anon;

-- Add function to get customer statistics with breakdown
CREATE OR REPLACE FUNCTION get_customer_registration_stats()
RETURNS TABLE (
    total_customers BIGINT,
    email_registered BIGINT,
    google_oauth BIGINT,
    with_loyalty_points BIGINT
)
SECURITY DEFINER
AS $$
BEGIN
    -- Check if calling user is admin
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_role_assignments.user_id = auth.uid()
        AND user_role_assignments.role_name IN ('super_admin', 'admin', 'devops')
    ) THEN
        RAISE EXCEPTION 'Access denied: insufficient permissions';
    END IF;

    RETURN QUERY
    SELECT
        (SELECT COUNT(u.id)::BIGINT FROM auth.users u WHERE u.email IS NOT NULL) as total_customers,
        (SELECT COUNT(u.id)::BIGINT FROM auth.users u WHERE u.email IS NOT NULL AND NOT u.email LIKE '%googleusercontent%') as email_registered,
        (SELECT COUNT(u.id)::BIGINT FROM auth.users u WHERE u.email LIKE '%googleusercontent%') as google_oauth,
        (SELECT COUNT(DISTINCT clp.user_id)::BIGINT FROM customer_loyalty_points clp) as with_loyalty_points;
END;
$$ LANGUAGE plpgsql;

-- Grants for stats function
GRANT EXECUTE ON FUNCTION get_customer_registration_stats() TO authenticated;
