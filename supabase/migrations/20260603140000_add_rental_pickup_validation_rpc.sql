-- ============================================================
-- Migration: Add validate_rental_pickup RPC
-- Date: 2026-06-03
-- Description: Validates a rental QR code (pickup) and sets status to active
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_rental_pickup(
  p_order_number TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rental_order RECORD;
  v_admin_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_item RECORD;
BEGIN
  -- 1. Get the admin making the request
  v_admin_id := auth.uid();
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized: Only admins can validate rental pickups');
  END IF;

  -- 2. Find the rental order
  SELECT * INTO v_rental_order
  FROM public.rental_orders
  WHERE order_number = p_order_number;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Rental order not found');
  END IF;

  -- 3. Check status
  IF v_rental_order.status = 'active' THEN
    RETURN jsonb_build_object('error', 'Pesanan sudah berstatus Disewa (Active)');
  END IF;

  IF v_rental_order.status != 'paid' THEN
    RETURN jsonb_build_object('error', 'Pesanan belum dibayar atau tidak valid untuk pickup. Status saat ini: ' || v_rental_order.status);
  END IF;

  -- 4. Update the order status to 'active'
  UPDATE public.rental_orders
  SET 
    status = 'active',
    updated_at = v_now
  WHERE id = v_rental_order.id;

  -- 5. Update items and record history
  FOR v_item IN SELECT id FROM public.rental_order_items WHERE rental_order_id = v_rental_order.id
  LOOP
    -- Update item status
    UPDATE public.rental_order_items
    SET 
      current_status = 'rented',
      status_updated_at = v_now
    WHERE id = v_item.id;

    -- Record history
    INSERT INTO public.rental_item_status_history (
      rental_order_id,
      rental_order_item_id,
      status,
      previous_status,
      reason,
      created_at,
      created_by
    ) VALUES (
      v_rental_order.id,
      v_item.id,
      'rented',
      'reserved',
      'Customer picked up the rental item',
      v_now,
      v_admin_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Rental order validated and marked as active (Disewa)',
    'order_number', v_rental_order.order_number,
    'customer_name', v_rental_order.customer_name
  );
END;
$$;
