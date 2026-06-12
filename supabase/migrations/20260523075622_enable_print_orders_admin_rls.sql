-- Enable RLS on print_orders
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;

-- Allow admin and super_admin to read print_orders
DROP POLICY IF EXISTS "print_orders_read_admin" ON public.print_orders;
CREATE POLICY "print_orders_read_admin" ON public.print_orders
    FOR SELECT TO authenticated
    USING (
        EXISTS(
            SELECT 1 FROM public.user_role_assignments
            WHERE user_id = auth.uid()
            AND role_name IN ('admin', 'super_admin')
        )
    );
