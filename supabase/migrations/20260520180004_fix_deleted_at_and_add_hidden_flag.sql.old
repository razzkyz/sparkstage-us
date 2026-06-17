-- Add is_hidden_by_user column to orders and a function to hide them

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS is_hidden_by_user BOOLEAN DEFAULT false;

-- Create RPC to hide user order
CREATE OR REPLACE FUNCTION public.hide_user_order(
  p_order_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_number TEXT := btrim(coalesce(p_order_number, ''));
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_order_number = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_order_number',
      'message', 'Missing order number'
    );
  END IF;

  -- Ensure the order belongs to the user calling this
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE order_number = v_order_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'order_not_found',
      'message', 'Order not found'
    );
  END IF;

  -- Allow authenticated user to hide their own order
  IF auth.uid() IS NULL OR v_order.user_id IS DISTINCT FROM auth.uid()::text THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'Forbidden'
    );
  END IF;

  UPDATE public.orders
  SET is_hidden_by_user = true
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Order hidden'
  );
END;
$$;

-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION public.hide_user_order(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hide_user_order(TEXT) FROM anon;

-- Grant to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.hide_user_order(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_user_order(TEXT) TO service_role;
