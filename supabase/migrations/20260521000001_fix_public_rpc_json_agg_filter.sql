-- Migration: Fix public RPC function JSON_AGG syntax error
-- Date: 2026-05-21
-- Description: Remove duplicate FILTER clauses in JSON_AGG that cause
-- "structure of query does not match function result type" error

CREATE OR REPLACE FUNCTION public.get_order_and_tickets_by_order_number(
  p_order_number TEXT
)
RETURNS TABLE (
  order_id BIGINT,
  order_number TEXT,
  user_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_amount BIGINT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  order_items JSON,
  tickets JSON
) AS $$
DECLARE
  v_order_id BIGINT;
  v_user_id TEXT;
BEGIN
  -- Fetch the order (only pending/paid states)
  -- Use public.orders.user_id to prevent ambiguity with the OUT parameter 'user_id'
  SELECT id, public.orders.user_id INTO v_order_id, v_user_id
  FROM public.orders
  WHERE public.orders.order_number = p_order_number
    AND public.orders.status IN ('pending', 'paid');
  
  IF v_order_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Return order details with related items and tickets
  RETURN QUERY
  SELECT
    o.id,
    o.order_number,
    o.user_id,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.total_amount,
    o.status,
    o.expires_at,
    o.created_at,
    o.updated_at,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', oi.id,
          'ticket_id', oi.ticket_id,
          'selected_date', oi.selected_date,
          'selected_time_slots', oi.selected_time_slots,
          'quantity', oi.quantity,
          'unit_price', oi.unit_price,
          'subtotal', oi.subtotal
        )
        ORDER BY oi.id
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::JSON
    ) AS order_items,
    COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', pt.id,
          'ticket_code', pt.ticket_code,
          'valid_date', pt.valid_date,
          'time_slot', pt.time_slot,
          'queue_number', pt.queue_number,
          'queue_overflow', pt.queue_overflow,
          'status', pt.status,
          'ticket_id', pt.ticket_id,
          'ticket_name', t.name,
          'ticket_type', t.type
        )
        ORDER BY pt.id
      ) FILTER (WHERE pt.id IS NOT NULL),
      '[]'::JSON
    ) AS tickets
  FROM public.orders o
  LEFT JOIN public.order_items oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
  LEFT JOIN public.purchased_tickets pt ON pt.order_item_id = oi.id AND pt.deleted_at IS NULL
  LEFT JOIN public.tickets t ON t.id = pt.ticket_id
  WHERE o.id = v_order_id
    AND o.deleted_at IS NULL
  GROUP BY o.id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_order_and_tickets_by_order_number(TEXT) TO anon, authenticated;
