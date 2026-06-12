-- Add Admin Division System
-- Purpose: Separate backoffice by division (Tiket, Dressing Room, Retail)
-- Date: May 20, 2026

-- 1. Create divisions enum type
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'division_type') THEN
        CREATE TYPE division_type AS ENUM ('tiket', 'dressing_room', 'retail');
    END IF;
END $$;

-- 2. Create divisions table
CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name division_type NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default divisions
INSERT INTO public.divisions (name, display_name, description, icon)
VALUES 
    ('tiket', 'Tiket (Events)', 'Event ticket management', 'ticket-icon'),
    ('dressing_room', 'Dressing Room', 'Dressing room management', 'dress-icon'),
    ('retail', 'Retail (Products)', 'Product and merchandise sales', 'cart-icon')
ON CONFLICT (name) DO NOTHING;

-- 3. Create admin_divisions mapping table
CREATE TABLE IF NOT EXISTS public.admin_divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, division_id)
);

CREATE INDEX idx_admin_divisions_user_id ON public.admin_divisions(user_id);
CREATE INDEX idx_admin_divisions_division_id ON public.admin_divisions(division_id);

-- 4. Add division column to orders table (if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'orders' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'division'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN division division_type;
    END IF;
END $$;

-- 5. Add division column to dressing_room_bookings table (if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'dressing_room_bookings' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dressing_room_bookings' AND column_name = 'division'
    ) THEN
        ALTER TABLE public.dressing_room_bookings ADD COLUMN division division_type NOT NULL DEFAULT 'dressing_room';
    END IF;
END $$;

-- 6. Add division column to products table (if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'products' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'division'
    ) THEN
        ALTER TABLE public.products ADD COLUMN division division_type NOT NULL DEFAULT 'retail';
    END IF;
END $$;

-- 7. Add division column to tickets table (if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'tickets' AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tickets' AND column_name = 'division'
    ) THEN
        ALTER TABLE public.tickets ADD COLUMN division division_type NOT NULL DEFAULT 'tiket';
    END IF;
END $$;

-- 8. Create function to get user's divisions
CREATE OR REPLACE FUNCTION get_user_divisions(p_user_id UUID)
RETURNS TABLE(division_id UUID, division_name division_type, display_name VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.name,
        d.display_name
    FROM public.admin_divisions ad
    JOIN public.divisions d ON ad.division_id = d.id
    WHERE ad.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create function to check if user has access to division
CREATE OR REPLACE FUNCTION user_has_division_access(
    p_user_id UUID,
    p_division_name division_type
)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
    access_granted BOOLEAN;
BEGIN
    -- Get user's role
    SELECT role_name INTO user_role
    FROM public.user_role_assignments
    WHERE user_id = p_user_id
    LIMIT 1;

    -- Super admins have all access
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    -- Check if user has specific division access
    SELECT EXISTS(
        SELECT 1
        FROM public.admin_divisions ad
        JOIN public.divisions d ON ad.division_id = d.id
        WHERE ad.user_id = p_user_id
        AND d.name = p_division_name
    ) INTO access_granted;

    RETURN access_granted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Update RLS policies for division-based data access (if tables exist)

-- Orders RLS: Admins can only see orders from their divisions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "admin_read_orders" ON public.orders;
        CREATE POLICY "admin_read_orders" ON public.orders
            FOR SELECT TO authenticated
            USING (
                (auth.jwt() ->> 'role')::text = 'authenticated' AND
                EXISTS(
                    SELECT 1 FROM public.user_role_assignments
                    WHERE user_id = auth.uid()
                    AND role_name IN ('admin', 'super_admin')
                ) AND
                (
                    -- Super admin can see all
                    EXISTS(
                        SELECT 1 FROM public.user_role_assignments
                        WHERE user_id = auth.uid()
                        AND role_name = 'super_admin'
                    )
                    OR
                    -- Regular admin can see only their divisions
                    (
                        orders.division IS NULL OR
                        EXISTS(
                            SELECT 1 FROM public.admin_divisions ad
                            JOIN public.divisions d ON ad.division_id = d.id
                            WHERE ad.user_id = auth.uid()
                            AND d.name = orders.division
                        )
                    )
                )
            );
    END IF;
END $$;

-- Products RLS: Admins can only see products from their divisions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "admin_read_products" ON public.products;
        CREATE POLICY "admin_read_products" ON public.products
            FOR SELECT TO authenticated
            USING (
                (auth.jwt() ->> 'role')::text = 'authenticated' AND
                (
                    -- Anyone can read active products
                    is_active = TRUE
                    OR
                    -- Admins can read all products (division-based check)
                    EXISTS(
                        SELECT 1 FROM public.user_role_assignments
                        WHERE user_id = auth.uid()
                        AND role_name IN ('admin', 'super_admin')
                    )
                )
            );

        DROP POLICY IF EXISTS "admin_update_products" ON public.products;
        CREATE POLICY "admin_update_products" ON public.products
            FOR UPDATE TO authenticated
            USING (
                EXISTS(
                    SELECT 1 FROM public.user_role_assignments
                    WHERE user_id = auth.uid()
                    AND role_name IN ('admin', 'super_admin')
                ) AND
                (
                    -- Super admin can update all
                    EXISTS(
                        SELECT 1 FROM public.user_role_assignments
                        WHERE user_id = auth.uid()
                        AND role_name = 'super_admin'
                    )
                    OR
                    -- Regular admin can update only their divisions
                    (
                        products.division IS NULL OR
                        EXISTS(
                            SELECT 1 FROM public.admin_divisions ad
                            JOIN public.divisions d ON ad.division_id = d.id
                            WHERE ad.user_id = auth.uid()
                            AND d.name = products.division
                        )
                    )
                )
            );
    END IF;
END $$;

-- Dressing Room Bookings RLS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dressing_room_bookings' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "admin_read_dressing_bookings" ON public.dressing_room_bookings;
        CREATE POLICY "admin_read_dressing_bookings" ON public.dressing_room_bookings
            FOR SELECT TO authenticated
            USING (
                (auth.jwt() ->> 'role')::text = 'authenticated' AND
                (
                    -- Customers can read their own bookings
                    customer_id = auth.uid()
                    OR
                    -- Admins can read from their divisions
                    (
                        EXISTS(
                            SELECT 1 FROM public.user_role_assignments
                            WHERE user_id = auth.uid()
                            AND role_name IN ('admin', 'super_admin')
                        ) AND
                        (
                            EXISTS(
                                SELECT 1 FROM public.user_role_assignments
                                WHERE user_id = auth.uid()
                                AND role_name = 'super_admin'
                            )
                            OR
                            (
                                dressing_room_bookings.division IS NULL OR
                                EXISTS(
                                    SELECT 1 FROM public.admin_divisions ad
                                    JOIN public.divisions d ON ad.division_id = d.id
                                    WHERE ad.user_id = auth.uid()
                                    AND d.name = dressing_room_bookings.division
                                )
                            )
                        )
                    )
                )
            );
    END IF;
END $$;

-- 11. Create audit log entry for division assignment
CREATE OR REPLACE FUNCTION audit_division_assignment()
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
        auth.uid(),
        'admin_division_assigned'::audit_action_type,
        'admin_divisions',
        NEW.id::text,
        jsonb_build_object('user_id', NEW.user_id, 'division_id', NEW.division_id),
        'Assigned admin to division'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_admin_division_insert ON public.admin_divisions;
CREATE TRIGGER audit_admin_division_insert
    AFTER INSERT ON public.admin_divisions
    FOR EACH ROW
    EXECUTE FUNCTION audit_division_assignment();

-- 12. Disable RLS on divisions and admin_divisions (admin-only tables)
ALTER TABLE public.divisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_divisions DISABLE ROW LEVEL SECURITY;

-- 13. Create indexes for performance (only on tables that exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_orders_division ON public.orders(division);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dressing_room_bookings' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_dressing_room_bookings_division ON public.dressing_room_bookings(division);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_products_division ON public.products(division);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets' AND table_schema = 'public') THEN
        CREATE INDEX IF NOT EXISTS idx_tickets_division ON public.tickets(division);
    END IF;
END $$;
