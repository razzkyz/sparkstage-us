-- Migration: Track Admin Login History
-- Date: 2026-05-26

-- 1. Create a function to log admin logins to the audit_logs table
CREATE OR REPLACE FUNCTION public.log_admin_login()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Check if last_sign_in_at changed and is not null
    IF (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at AND NEW.last_sign_in_at IS NOT NULL) THEN
        
        -- Check if the user is an admin by querying user_role_assignments
        SELECT EXISTS (
            SELECT 1 FROM public.user_role_assignments ura 
            WHERE ura.user_id = NEW.id 
            AND ura.role IN ('admin', 'super_admin')
        ) INTO v_is_admin;

        IF v_is_admin THEN
            INSERT INTO public.audit_logs (
                user_id,
                action,
                table_name,
                record_id,
                description
            ) VALUES (
                NEW.id,
                'user_logged_in',
                'auth.users',
                NEW.id::text,
                'Admin ' || COALESCE(NEW.email, 'unknown') || ' logged in.'
            );
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fail silently to not block logins
    RAISE WARNING 'Audit log for admin login failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to auth.users
DROP TRIGGER IF EXISTS on_admin_login ON auth.users;
CREATE TRIGGER on_admin_login
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.log_admin_login();
