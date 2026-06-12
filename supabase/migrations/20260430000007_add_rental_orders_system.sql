-- Rental Orders System for Dressing Room
-- This migration creates tables and functions for managing clothing rentals

-- Main rental orders table
CREATE TABLE IF NOT EXISTS public.rental_orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Customer data
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  customer_bank_name TEXT,
  customer_bank_account_number TEXT,
  customer_bank_account_name TEXT,
  
  -- Rental timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL,
  
  -- Pricing
  daily_fee_per_item INTEGER NOT NULL DEFAULT 15000,
  total_rental_cost INTEGER NOT NULL,
  total_deposit INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'due_soon', 'overdue', 'returned', 'refund_process', 'completed')),
  
  -- Agreement
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  terms_signature TEXT,
  
  -- Invoice
  invoice_sent BOOLEAN NOT NULL DEFAULT false,
  invoice_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Return processing
  return_time TIMESTAMP WITH TIME ZONE,
  late_fee INTEGER NOT NULL DEFAULT 0,
  damage_deduction INTEGER NOT NULL DEFAULT 0,
  refund_amount INTEGER,
  refund_processed BOOLEAN NOT NULL DEFAULT false,
  refund_processed_at TIMESTAMP WITH TIME ZONE,
  refund_proof_url TEXT,
  refund_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Rental order items table
CREATE TABLE IF NOT EXISTS public.rental_order_items (
  id BIGSERIAL PRIMARY KEY,
  rental_order_id BIGINT NOT NULL REFERENCES public.rental_orders(id) ON DELETE CASCADE,
  
  -- Product info
  product_id INTEGER REFERENCES public.products(id) ON DELETE SET NULL,
  product_variant_id INTEGER REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  
  -- Pricing
  product_price INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  rental_cost INTEGER NOT NULL,
  total_item_cost INTEGER NOT NULL,
  
  -- Return condition
  return_condition TEXT CHECK (return_condition IN ('normal', 'stained', 'button_missing', 'damaged', 'severely_damaged')),
  damage_deduction INTEGER NOT NULL DEFAULT 0,
  deposit_refunded INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_orders_user_id ON public.rental_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_orders_status ON public.rental_orders(status);
CREATE INDEX IF NOT EXISTS idx_rental_orders_end_time ON public.rental_orders(end_time);
CREATE INDEX IF NOT EXISTS idx_rental_orders_order_number ON public.rental_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_rental_order_items_rental_order_id ON public.rental_order_items(rental_order_id);
CREATE INDEX IF NOT EXISTS idx_rental_order_items_product_variant_id ON public.rental_order_items(product_variant_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_rental_orders_updated_at
  BEFORE UPDATE ON public.rental_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_order_items_updated_at
  BEFORE UPDATE ON public.rental_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_rental_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
  prefix TEXT := 'RTL';
BEGIN
  -- Format: RTL-YYYYMMDD-XXXX
  SELECT prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('rental_order_seq')::TEXT, 4, '0')
  INTO order_num;
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS rental_order_seq START 1;

-- Function to update rental order status based on end time
CREATE OR REPLACE FUNCTION public.update_rental_order_status()
RETURNS VOID AS $$
BEGIN
  -- Mark as due_soon if within 3 hours of end time
  UPDATE public.rental_orders
  SET status = 'due_soon'
  WHERE status = 'active'
    AND end_time <= NOW() + INTERVAL '3 hours'
    AND end_time > NOW();
  
  -- Mark as overdue if past end time
  UPDATE public.rental_orders
  SET status = 'overdue'
  WHERE status IN ('active', 'due_soon')
    AND end_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to calculate late fee (5rb per hour)
CREATE OR REPLACE FUNCTION public.calculate_late_fee(end_time TIMESTAMP WITH TIME ZONE, return_time TIMESTAMP WITH TIME ZONE)
RETURNS INTEGER AS $$
DECLARE
  hours_late INTEGER;
BEGIN
  IF return_time IS NULL OR return_time <= end_time THEN
    RETURN 0;
  END IF;
  
  hours_late := EXTRACT(EPOCH FROM (return_time - end_time)) / 3600;
  RETURN CEIL(hours_late) * 5000;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate refund amount
CREATE OR REPLACE FUNCTION public.calculate_refund_amount(rental_order_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  total_deposit INTEGER;
  late_fee INTEGER;
  damage_deduction INTEGER;
  refund_amount INTEGER;
BEGIN
  SELECT total_deposit INTO total_deposit
  FROM public.rental_orders
  WHERE id = rental_order_id;
  
  SELECT COALESCE(SUM(damage_deduction), 0) INTO damage_deduction
  FROM public.rental_order_items
  WHERE rental_order_id = rental_order_id;
  
  SELECT late_fee INTO late_fee
  FROM public.rental_orders
  WHERE id = rental_order_id;
  
  refund_amount := total_deposit - late_fee - damage_deduction;
  
  -- Ensure refund is not negative
  IF refund_amount < 0 THEN
    refund_amount := 0;
  END IF;
  
  RETURN refund_amount;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_order_items ENABLE ROW LEVEL SECURITY;

-- Allow admins full access using public.is_admin() function
-- Replaced deprecated auth.users.raw_user_meta_data approach
CREATE POLICY "Admins can manage rental orders"
  ON public.rental_orders
  FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admins can manage rental order items"
  ON public.rental_order_items
  FOR ALL
  USING (public.is_admin());

-- Allow users to view their own orders
CREATE POLICY "Users can view own rental orders"
  ON public.rental_orders
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own rental order items"
  ON public.rental_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_orders
      WHERE rental_orders.id = rental_order_items.rental_order_id
      AND rental_orders.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.rental_orders TO authenticated;
GRANT ALL ON public.rental_order_items TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
