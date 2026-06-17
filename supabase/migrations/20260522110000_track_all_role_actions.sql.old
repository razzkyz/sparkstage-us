-- Migration: Track All Role Actions (Starguide, Kasir, etc.)
-- Date: 2026-05-22

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
    'product_order_created'
  ));

-- 2. Trigger for purchased_tickets UPDATE (Tracking Starguide Scanning)
CREATE OR REPLACE FUNCTION audit_purchased_tickets_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status changed to 'used' (which implies it was scanned)
    IF NEW.status != OLD.status AND NEW.status = 'used' THEN
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
            'ticket_scanned'::VARCHAR,
            'purchased_tickets',
            NEW.id::text,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status, 'ticket_code', NEW.ticket_code),
            'Ticket scanned: ' || NEW.ticket_code
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_purchased_tickets_update ON public.purchased_tickets;
CREATE TRIGGER audit_purchased_tickets_update
    AFTER UPDATE ON public.purchased_tickets
    FOR EACH ROW
    EXECUTE FUNCTION audit_purchased_tickets_update();

-- 3. Trigger for orders INSERT (Tracking Kasir Selling Tickets)
CREATE OR REPLACE FUNCTION audit_orders_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_values,
        description
    )
    VALUES (
        COALESCE(auth.uid(), gen_random_uuid()),
        'order_created'::VARCHAR,
        'orders',
        NEW.id::text,
        jsonb_build_object(
            'total_amount', NEW.total_amount,
            'status', NEW.status
        ),
        'Created ticket order: ' || NEW.id
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_orders_insert ON public.orders;
CREATE TRIGGER audit_orders_insert
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_orders_insert();

-- 4. Trigger for product_orders INSERT (Tracking Kasir Selling Products)
CREATE OR REPLACE FUNCTION audit_product_orders_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        new_values,
        description
    )
    VALUES (
        COALESCE(auth.uid(), gen_random_uuid()),
        'product_order_created'::VARCHAR,
        'product_orders',
        NEW.id::text,
        jsonb_build_object(
            'total_amount', NEW.total_amount,
            'status', NEW.status
        ),
        'Created product order: ' || NEW.id
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_product_orders_insert ON public.product_orders;
CREATE TRIGGER audit_product_orders_insert
    AFTER INSERT ON public.product_orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_product_orders_insert();
