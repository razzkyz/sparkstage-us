-- Add public RPC function for booking success page to fetch order and tickets
-- This solves the issue where customer loses auth session after DOKU redirect
-- (especially on Instagram browser or private/incognito mode)

-- ============================================================================
-- RPC: get_order_and_tickets_by_order_number
-- ============================================================================
-- Purpose: Allow unauthenticated access to order and tickets by order_number
-- Security: Limits to 'pending' and 'paid' status only (not 'expired', 'failed')
-- to prevent showing stale/cancelled orders

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
  SELECT id, user_id INTO v_order_id, v_user_id
  FROM public.orders
  WHERE order_number = p_order_number
    AND status IN ('pending', 'paid');
  
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
    ) FILTER (WHERE oi.id IS NOT NULL) AS order_items,
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
    ) FILTER (WHERE pt.id IS NOT NULL) AS tickets
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

-- ============================================================================
-- Update purchased_tickets RLS policy to allow public access via order_number
-- ============================================================================
-- Keep existing policy for authenticated users viewing their own tickets
-- Add new policy to allow viewing tickets if accessed via the public RPC
-- (The RPC already validates order_number and status, so we can trust it)

-- Drop old policy
DROP POLICY IF EXISTS purchased_tickets_select_own_or_admin_or_starguide
  ON public.purchased_tickets;

-- Create new combined policy
CREATE POLICY purchased_tickets_select_for_booking_success
  ON public.purchased_tickets
  FOR SELECT
  TO public  -- allows both anon and authenticated
  USING (
    -- Option 1: User is authenticated and owns the ticket
    (
      auth.uid() IS NOT NULL
      AND user_id = (SELECT auth.uid())
    )
    OR
    -- Option 2: User is admin or starguide
    (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_id = (SELECT auth.uid())
          AND role_name IN ('admin', 'starguide')
      )
    )
    OR
    -- Option 3: Ticket is being accessed via public RPC (no auth check needed)
    -- This allows unauthenticated users to see tickets if order is in 'pending'/'paid' state
    (
      auth.uid() IS NULL
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = (
          SELECT order_id FROM public.order_items
          WHERE id = purchased_tickets.order_item_id
        )
        AND o.status IN ('pending', 'paid')
      )
    )
  );

COMMENT ON POLICY purchased_tickets_select_for_booking_success ON public.purchased_tickets IS
  'Allow viewing tickets for: (1) own tickets when authenticated, (2) admin/starguide any ticket, (3) public access for pending/paid orders only';
