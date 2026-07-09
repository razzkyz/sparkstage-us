-- Bagian penting: Buat fonnte_whatsapp_logs table
CREATE TABLE IF NOT EXISTS fonnte_whatsapp_logs (
  id BIGSERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  invoice_number TEXT,
  message_type TEXT NOT NULL DEFAULT 'invoice',
  message_content TEXT,
  fonnte_message_id TEXT,
  provider_status TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes untuk query efficiency
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_order_id ON fonnte_whatsapp_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_order_number ON fonnte_whatsapp_logs(order_number);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_delivery_status ON fonnte_whatsapp_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_fonnte_logs_created_at ON fonnte_whatsapp_logs(created_at DESC);

-- Enable RLS
ALTER TABLE fonnte_whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Policy untuk service_role (Edge Functions bisa akses)
DROP POLICY IF EXISTS "service_role_can_all" ON fonnte_whatsapp_logs;
CREATE POLICY "service_role_can_all" ON fonnte_whatsapp_logs
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Grant access
GRANT ALL ON fonnte_whatsapp_logs TO service_role;

-- Verify: Check table exists
SELECT 'fonnte_whatsapp_logs table created successfully!' as status;
