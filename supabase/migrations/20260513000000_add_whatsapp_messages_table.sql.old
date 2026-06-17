-- Create whatsapp_messages table to track all sent WhatsApp notifications
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id BIGSERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  template_id TEXT NOT NULL,
  -- Message parameters
  params JSONB NOT NULL, -- Array of template parameters
  ticket_code TEXT, -- First ticket code from the order
  booking_date TEXT,
  session_time TEXT,
  ticket_count INTEGER,
  -- DOKU response
  doku_message_id TEXT,
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
CREATE INDEX idx_whatsapp_messages_order_id ON whatsapp_messages(order_id);
CREATE INDEX idx_whatsapp_messages_order_number ON whatsapp_messages(order_number);
CREATE INDEX idx_whatsapp_messages_customer_phone ON whatsapp_messages(customer_phone);
CREATE INDEX idx_whatsapp_messages_doku_message_id ON whatsapp_messages(doku_message_id);
CREATE INDEX idx_whatsapp_messages_delivery_status ON whatsapp_messages(delivery_status);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_ticket_code ON whatsapp_messages(ticket_code);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_whatsapp_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_messages_update_timestamp
BEFORE UPDATE ON whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_messages_updated_at();

-- Comments for documentation
COMMENT ON TABLE whatsapp_messages IS 'Tracks all WhatsApp ticket confirmation messages sent via DOKU API';
COMMENT ON COLUMN whatsapp_messages.params IS 'Array of template parameters: [customerName, ticketCode, bookingDate, sessionTime, ticketCount, venueName]';
COMMENT ON COLUMN whatsapp_messages.delivery_status IS 'pending = not yet sent, submitted = sent to DOKU, delivered = delivered to phone, failed = send failed, read = customer read message';
COMMENT ON COLUMN whatsapp_messages.doku_message_id IS 'Message ID returned by DOKU API, used for tracking and reconciliation';

-- Enable RLS on whatsapp_messages table
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

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

-- Grant access to service role
GRANT ALL ON whatsapp_messages TO service_role;
GRANT ALL ON whatsapp_messages_id_seq TO service_role;
