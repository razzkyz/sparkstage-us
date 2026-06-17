-- Grant update on the is_hidden_by_user column to authenticated users
GRANT UPDATE (is_hidden_by_user) ON public.orders TO authenticated;

-- Add a policy to allow users to update their own orders (only for this column, restricted by GRANT)
CREATE POLICY "users_hide_own_orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
