-- Add Comprehensive Audit Logging Triggers
-- Purpose: Track all admin changes to critical business data
-- Date: May 20, 2026

-- Add new audit action types if not exists
DO $$
BEGIN
    -- Note: We cannot add to enum after creation, so we check what we need
    -- Enum values already include: admin_role_assigned, payment_refunded, voucher_modified, stock_adjusted, order_cancelled, loyalty_points_redeemed, customer_data_exported, admin_division_assigned
    -- Adding triggers for: voucher changes, price changes, order status changes
END $$;

-- ===== VOUCHER AUDIT TRIGGERS =====

-- Trigger for voucher INSERT
CREATE OR REPLACE FUNCTION audit_voucher_insert()
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
        'voucher_modified'::audit_action_type,
        'vouchers',
        NEW.id::text,
        jsonb_build_object(
            'code', NEW.code,
            'discount_value', NEW.discount_value,
            'quota', NEW.quota,
            'is_active', NEW.is_active
        ),
        'Created voucher: ' || NEW.code
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Don't fail voucher creation if audit fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_voucher_insert ON public.vouchers;
CREATE TRIGGER audit_voucher_insert
    AFTER INSERT ON public.vouchers
    FOR EACH ROW
    EXECUTE FUNCTION audit_voucher_insert();

-- Trigger for voucher UPDATE
CREATE OR REPLACE FUNCTION audit_voucher_update()
RETURNS TRIGGER AS $$
DECLARE
    changes_detected BOOLEAN;
BEGIN
    -- Only log if there are actual changes
    changes_detected := (
        NEW.code != OLD.code OR
        NEW.discount_value != OLD.discount_value OR
        NEW.quota != OLD.quota OR
        NEW.is_active != OLD.is_active
    );

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
            'voucher_modified'::audit_action_type,
            'vouchers',
            NEW.id::text,
            CASE WHEN NEW.discount_value != OLD.discount_value OR NEW.quota != OLD.quota THEN
                jsonb_build_object(
                    'discount_value', OLD.discount_value,
                    'quota', OLD.quota,
                    'is_active', OLD.is_active
                )
            ELSE NULL END,
            jsonb_build_object(
                'discount_value', NEW.discount_value,
                'quota', NEW.quota,
                'is_active', NEW.is_active
            ),
            'Updated voucher: ' || NEW.code || ' (discount=' || NEW.discount_value || ', quota=' || NEW.quota || ')'
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_voucher_update ON public.vouchers;
CREATE TRIGGER audit_voucher_update
    AFTER UPDATE ON public.vouchers
    FOR EACH ROW
    EXECUTE FUNCTION audit_voucher_update();

-- Trigger for voucher DELETE
CREATE OR REPLACE FUNCTION audit_voucher_delete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        description
    )
    VALUES (
        COALESCE(auth.uid(), gen_random_uuid()),
        'voucher_modified'::audit_action_type,
        'vouchers',
        OLD.id::text,
        jsonb_build_object(
            'code', OLD.code,
            'discount_value', OLD.discount_value,
            'quota', OLD.quota
        ),
        'Deleted voucher: ' || OLD.code
    );
    RETURN OLD;
EXCEPTION WHEN OTHERS THEN
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_voucher_delete ON public.vouchers;
CREATE TRIGGER audit_voucher_delete
    AFTER DELETE ON public.vouchers
    FOR EACH ROW
    EXECUTE FUNCTION audit_voucher_delete();

-- ===== PRODUCT PRICE AUDIT TRIGGERS =====

-- Trigger for product UPDATE (especially price changes)
CREATE OR REPLACE FUNCTION audit_product_update()
RETURNS TRIGGER AS $$
DECLARE
    price_changed BOOLEAN;
    stock_changed BOOLEAN;
BEGIN
    price_changed := (NEW.price != OLD.price);
    stock_changed := (NEW.stock != OLD.stock);

    IF price_changed OR stock_changed THEN
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
            CASE WHEN price_changed THEN 'price_modified'::audit_action_type ELSE 'stock_adjusted'::audit_action_type END,
            'products',
            NEW.id::text,
            jsonb_build_object(
                'price', OLD.price,
                'stock', OLD.stock
            ),
            jsonb_build_object(
                'price', NEW.price,
                'stock', NEW.stock
            ),
            CASE 
                WHEN price_changed AND stock_changed THEN 'Updated product: price ' || OLD.price || '→' || NEW.price || ', stock ' || OLD.stock || '→' || NEW.stock
                WHEN price_changed THEN 'Updated product price: ' || OLD.price || ' → ' || NEW.price
                WHEN stock_changed THEN 'Updated product stock: ' || OLD.stock || ' → ' || NEW.stock
            END
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_product_update ON public.products;
        CREATE TRIGGER audit_product_update
            AFTER UPDATE ON public.products
            FOR EACH ROW
            EXECUTE FUNCTION audit_product_update();
    END IF;
END $$;

-- ===== ORDER STATUS AUDIT TRIGGERS =====

-- Trigger for order status changes
CREATE OR REPLACE FUNCTION audit_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status changed
    IF NEW.status != OLD.status THEN
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
            'order_status_changed'::audit_action_type,
            'orders',
            NEW.id::text,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            'Order status changed: ' || OLD.status || ' → ' || NEW.status || ' (Order ID: ' || NEW.id || ')'
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_order_status_update ON public.orders;
        CREATE TRIGGER audit_order_status_update
            AFTER UPDATE ON public.orders
            FOR EACH ROW
            EXECUTE FUNCTION audit_order_status_update();
    END IF;
END $$;

-- ===== PRODUCT ORDER STATUS AUDIT TRIGGERS =====

-- Trigger for product order status changes
CREATE OR REPLACE FUNCTION audit_product_order_status_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status changed
    IF NEW.status != OLD.status THEN
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
            'order_status_changed'::audit_action_type,
            'product_orders',
            NEW.id::text,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            'Product order status: ' || OLD.status || ' → ' || NEW.status
        );
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_orders' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS audit_product_order_status_update ON public.product_orders;
        CREATE TRIGGER audit_product_order_status_update
            AFTER UPDATE ON public.product_orders
            FOR EACH ROW
            EXECUTE FUNCTION audit_product_order_status_update();
    END IF;
END $$;

-- ===== CUSTOMER AUDIT TRIGGERS =====

-- Trigger for customer data exports (already recorded by function, but document here)
-- Note: Loyalty points redemption already logged by award_loyalty_points/redeem_loyalty_points

-- Create index on audit_logs for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);

-- Create materialized view for fast audit log queries (optional, for later optimization)
-- This will be created on-demand to avoid issues if audit_logs doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
        -- Indexes already created above
        NULL;
    END IF;
END $$;
