-- Migration: Add DevOps Role and Audit Enhancements
-- Date: 2026-05-22

-- 1. Update audit_logs_action_check to allow 'product_modified'
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
    'referral_code_applied'
  ));

-- 2. Update RLS to allow devops to read audit logs
DROP POLICY IF EXISTS "admins_can_read_audit_logs" ON public.audit_logs;
CREATE POLICY "admins_can_read_audit_logs" ON public.audit_logs
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
      AND role_name IN ('admin', 'super_admin', 'devops')
    )
  );

-- 3. Replace the product update trigger to track ALL column changes
CREATE OR REPLACE FUNCTION public.audit_product_update()
RETURNS TRIGGER AS $$
DECLARE
    changes_detected BOOLEAN := false;
    v_old_values JSONB := '{}'::jsonb;
    v_new_values JSONB := '{}'::jsonb;
    old_row JSONB;
    new_row JSONB;
    k text;
    v jsonb;
BEGIN
    old_row := to_jsonb(OLD);
    new_row := to_jsonb(NEW);

    FOR k, v IN SELECT * FROM jsonb_each(new_row)
    LOOP
        IF v IS DISTINCT FROM (old_row->k) THEN
            changes_detected := true;
            v_old_values := jsonb_set(v_old_values, array[k], coalesce(old_row->k, 'null'::jsonb));
            v_new_values := jsonb_set(v_new_values, array[k], coalesce(v, 'null'::jsonb));
        END IF;
    END LOOP;

    IF changes_detected THEN
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
            'product_modified'::VARCHAR,
            'products',
            NEW.id::text,
            v_old_values,
            v_new_values,
            'Updated product details'
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if exists
DROP TRIGGER IF EXISTS audit_product_update ON public.products;
CREATE TRIGGER audit_product_update
    AFTER UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_product_update();

-- 4. Update get_admin_users and get_all_users_for_admin to allow devops
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (user_id UUID, email VARCHAR, role_name VARCHAR)
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_role_assignments.user_id = auth.uid()
        AND user_role_assignments.role_name IN ('super_admin', 'admin', 'devops')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT u.id as user_id, u.email::VARCHAR, r.role_name::VARCHAR
    FROM auth.users u
    JOIN public.user_role_assignments r ON u.id = r.user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (user_id UUID, email VARCHAR)
SECURITY DEFINER
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_role_assignments.user_id = auth.uid()
        AND user_role_assignments.role_name IN ('super_admin', 'admin', 'devops')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT u.id as user_id, u.email::VARCHAR
    FROM auth.users u;
END;
$$ LANGUAGE plpgsql;
