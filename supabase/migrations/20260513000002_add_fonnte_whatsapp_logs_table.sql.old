-- Create fonnte_whatsapp_logs table to track all WhatsApp messages sent via Fonnte
CREATE TABLE IF NOT EXISTS fonnte_whatsapp_logs (
  id BIGSERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  invoice_number TEXT,
  -- Message details
  message_type TEXT NOT NULL DEFAULT 'invoice', -- invoice, reminder, expiry_warning
  message_content TEXT,
  -- Fonnte response
  fonnte_message_id TEXT,
  provider_status TEXT, -- "submitted", "failed", etc
  -- Tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT DEFAULT 'pending', -- pending, submitted, delivered, failed, read
  error_message TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_order_id ON fonnte_whatsapp_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_order_number ON fonnte_whatsapp_logs(order_number);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_customer_phone ON fonnte_whatsapp_logs(customer_phone);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_message_type ON fonnte_whatsapp_logs(message_type);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_delivery_status ON fonnte_whatsapp_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_fonnte_message_id ON fonnte_whatsapp_logs(fonnte_message_id);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_created_at ON fonnte_whatsapp_logs(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fonnte_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fonnte_logs_update_timestamp
BEFORE UPDATE ON fonnte_whatsapp_logs
FOR EACH ROW
EXECUTE FUNCTION update_fonnte_logs_updated_at();

-- Comments for documentation
COMMENT ON TABLE fonnte_whatsapp_logs IS 'Tracks all WhatsApp messages sent via Fonnte API';
COMMENT ON COLUMN fonnte_whatsapp_logs.message_type IS 'Type of message: invoice, reminder, expiry_warning';
COMMENT ON COLUMN fonnte_whatsapp_logs.delivery_status IS 'pending, submitted, delivered, failed, read';
COMMENT ON COLUMN fonnte_whatsapp_logs.fonnte_message_id IS 'Message ID returned by Fonnte API for tracking';

-- Enable RLS
ALTER TABLE fonnte_whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Policy for service_role (Edge Functions)
DROP POLICY IF EXISTS "service_role_can_all" ON fonnte_whatsapp_logs;
CREATE POLICY "service_role_can_all" ON fonnte_whatsapp_logs
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Policy for authenticated users to read own orders
DROP POLICY IF EXISTS "users_read_own" ON fonnte_whatsapp_logs;
CREATE POLICY "users_read_own" ON fonnte_whatsapp_logs
  FOR SELECT
  USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
  );

-- Grant access to service role
GRANT ALL ON fonnte_whatsapp_logs TO service_role;
GRANT ALL ON fonnte_whatsapp_logs_id_seq TO service_role;
