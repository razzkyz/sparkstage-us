-- Add costume return tracking to order_products for dressing room laundry/return flow
ALTER TABLE public.order_products
  ADD COLUMN IF NOT EXISTS costume_return_status text
  CONSTRAINT costume_return_status_check CHECK (costume_return_status IN ('in_laundry', 'returned'));

COMMENT ON COLUMN public.order_products.costume_return_status IS
  'Dressing room costume return flow: null=pending, in_laundry=sent to laundry, returned=stock restored';

-- RPC: atomically restore stock when admin confirms costume is back and checked
CREATE OR REPLACE FUNCTION public.admin_return_costume_stock(p_order_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501';
  END IF;

  -- Guard: order must exist, be completed, and not already returned
  IF NOT EXISTS (
    SELECT 1 FROM order_products
    WHERE id = p_order_id
      AND pickup_status = 'completed'
      AND (costume_return_status IS NULL OR costume_return_status = 'in_laundry')
  ) THEN
    RAISE EXCEPTION 'Order tidak ditemukan atau stok sudah dikembalikan' USING ERRCODE = 'P0001';
  END IF;

  -- Restore stock for every item in the order
  FOR v_item IN
    SELECT opi.product_variant_id, opi.quantity
    FROM order_product_items opi
    WHERE opi.order_product_id = p_order_id
  LOOP
    UPDATE product_variants
    SET stock = GREATEST(COALESCE(stock, 0) + v_item.quantity, 0)
    WHERE id = v_item.product_variant_id;
  END LOOP;

  -- Mark order as stock-returned
  UPDATE order_products
  SET costume_return_status = 'returned',
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_return_costume_stock(bigint) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_return_costume_stock(bigint) FROM anon;
