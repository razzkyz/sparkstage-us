-- Migration: Track Dashboard Changes and Admin Logins
-- Date: 2026-05-26

-- 1. Update audit_logs_action_check to allow new actions
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (action IN (
    'admin_role_assigned',
    'admin_role_removed',
    'payment_refunded',
    'voucher_created',
    'voucher_modified',
    'voucher_deleted',
    'stock_adjusted',
    'order_cancelled',
    'loyalty_points_redeemed',
    'customer_data_exported',
    'admin_division_assigned',
    'price_modified',
    'order_status_changed',
    'product_modified',
    'referral_code_applied',
    'ticket_scanned',
    'order_created',
    'product_order_created',
    'dashboard_modified',
    'user_logged_in'
  ));

-- 2. Generic Trigger Function for Dashboard Settings Tables
CREATE OR REPLACE FUNCTION public.audit_dashboard_settings()
RETURNS TRIGGER AS $$
DECLARE
    v_action VARCHAR := 'dashboard_modified';
    v_table_name VARCHAR := TG_TABLE_NAME;
    v_record_id VARCHAR;
    v_old_values JSONB := NULL;
    v_new_values JSONB := NULL;
    v_description TEXT;
BEGIN
    -- Determine record ID (assumes id column exists, or specific key)
    IF TG_OP = 'INSERT' THEN
        v_record_id := COALESCE(NEW.id::text, 'new_record');
        v_new_values := row_to_json(NEW)::jsonb;
        v_description := 'Added record to ' || v_table_name;
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := COALESCE(NEW.id::text, OLD.id::text, 'updated_record');
        v_old_values := row_to_json(OLD)::jsonb;
        v_new_values := row_to_json(NEW)::jsonb;
        v_description := 'Updated record in ' || v_table_name;
        
        -- Don't log if nothing actually changed
        IF v_old_values = v_new_values THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_record_id := COALESCE(OLD.id::text, 'deleted_record');
        v_old_values := row_to_json(OLD)::jsonb;
        v_description := 'Deleted record from ' || v_table_name;
    END IF;

    -- Strip out large fields like base64 images if necessary, or just keep it simple.
    -- Assuming row_to_json is safe for these config tables.

    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        description
    )
    VALUES (
        COALESCE(auth.uid(), gen_random_uuid()),
        v_action::VARCHAR,
        v_table_name,
        v_record_id,
        v_old_values,
        v_new_values,
        v_description
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't break the application if logging fails
    RAISE WARNING 'Dashboard audit trigger failed: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply triggers to all dashboard settings tables

DO $$ 
DECLARE
    tbl_name VARCHAR;
    tables_to_audit VARCHAR[] := ARRAY[
        'booking_page_settings', 
        'glam_page_settings', 
        'charm_bar_settings', 
        'event_page_settings', 
        'news_settings', 
        'events_schedule', 
        'events_schedule_items', 
        'beauty_posters'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_audit LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            
            EXECUTE format('DROP TRIGGER IF EXISTS audit_%I_changes ON public.%I;', tbl_name, tbl_name);
            EXECUTE format('
                CREATE TRIGGER audit_%I_changes
                AFTER INSERT OR UPDATE OR DELETE ON public.%I
                FOR EACH ROW
                EXECUTE FUNCTION public.audit_dashboard_settings();
            ', tbl_name, tbl_name);
            
        END IF;
    END LOOP;
END $$;
