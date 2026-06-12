-- Add RLS policies to whatsapp_messages table

-- Enable RLS on whatsapp_messages table
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running migration safely)
DROP POLICY IF EXISTS "service_role_all" ON whatsapp_messages;
DROP POLICY IF EXISTS "users_read_own_orders" ON whatsapp_messages;

-- Policy for service_role (Edge Functions) to insert and read
CREATE POLICY "service_role_all" ON whatsapp_messages
  FOR ALL
  USING (TRUE)
  WITH CHECK (TRUE)
  TO service_role;

-- Policy for authenticated users to read their own order's messages
CREATE POLICY "users_read_own_orders" ON whatsapp_messages
  FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders
      WHERE user_id = auth.uid()
    )
  );
