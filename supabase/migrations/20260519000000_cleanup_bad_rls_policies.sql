-- Remove any legacy RLS policies on rental_orders that directly query auth.users
-- This resolves 403 Forbidden errors (permission denied for table users) when loading the dashboard

DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename
        FROM pg_policies 
        WHERE tablename IN ('rental_orders', 'rental_order_items')
          AND (qual LIKE '%auth.users%' OR with_check LIKE '%auth.users%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;
