-- Migration: Fix cancel_ticket_order_atomic JSON casting bug
-- Date: 2026-05-21
-- Description: Fix issue where non-array JSON values for selected_time_slots
-- are not properly extracted, causing invalid time casting errors.

CREATE OR REPLACE FUNCTION public.cancel_ticket_order_atomic(
  p_order_number TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_number TEXT := btrim(coalesce(p_order_number, ''));
  v_now TIMESTAMPTZ := now();
  v_order public.orders%ROWTYPE;
  v_item RECORD;
  v_slot TEXT;
  v_slots_jsonb JSONB;
BEGIN
  IF v_order_number = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_order_number',
      'message', 'Missing order number'
    );
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_user_id',
      'message', 'Missing user id'
    );
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE order_number = v_order_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'order_not_found',
      'message', 'Order not found'
    );
  END IF;

  -- Ensure we compare using text safely just in case user_id is UUID or TEXT
  IF v_order.user_id::text IS DISTINCT FROM p_user_id::text THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'Forbidden'
    );
  END IF;

  IF lower(coalesce(v_order.status, '')) = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'result', 'noop',
      'reason', 'already_paid',
      'order_number', v_order.order_number
    );
  END IF;

  IF lower(coalesce(v_order.status, '')) IN ('cancelled', 'expired', 'failed') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'result', 'noop',
      'reason', 'already_final',
      'order_number', v_order.order_number
    );
  END IF;

  -- Release ticket capacities for all items in the order
  FOR v_item IN
    SELECT ticket_id, selected_date, selected_time_slots, quantity
    FROM public.order_items
    WHERE order_id = v_order.id
  LOOP
    IF v_item.ticket_id IS NULL OR coalesce(v_item.quantity, 0) <= 0 THEN
      CONTINUE;
    END IF;

    -- Extract first slot from selected_time_slots JSON if available
    -- e.g. selected_time_slots can be '["10:00"]' or 'all-day'
    v_slot := NULL;
    
    IF v_item.selected_time_slots IS NOT NULL THEN
      BEGIN
        v_slots_jsonb := v_item.selected_time_slots::jsonb;
        
        IF jsonb_typeof(v_slots_jsonb) = 'array' AND jsonb_array_length(v_slots_jsonb) > 0 THEN
          -- Extract text from array element (removes quotes)
          v_slot := v_slots_jsonb->>0;
        ELSIF jsonb_typeof(v_slots_jsonb) = 'string' THEN
          -- Extract text from JSON string and strip quotes
          -- e.g. JSON "10:00" -> 10:00 (without quotes)
          v_slot := TRIM(v_slots_jsonb::text, '"');
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If it's already a plain text value like 'all-day' or '10:00'
        v_slot := v_item.selected_time_slots::text;
      END;
    END IF;

    -- Normalize: treat all-day and empty as NULL time_slot
    IF v_slot IS NULL OR v_slot = 'all-day' OR v_slot = '' THEN
      v_slot := NULL;
    END IF;

    PERFORM public.release_ticket_capacity(
      v_item.ticket_id,
      v_item.selected_date::date,
      v_slot,
      v_item.quantity
    );
  END LOOP;

  UPDATE public.orders
  SET status = 'cancelled',
      capacity_released_at = coalesce(capacity_released_at, v_now),
      updated_at = v_now
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'result', 'cancelled',
    'order_number', v_order.order_number,
    'order_id', v_order.id,
    'capacity_released_at', v_now
  );
END;
$$;

-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION public.cancel_ticket_order_atomic(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_ticket_order_atomic(TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cancel_ticket_order_atomic(TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_ticket_order_atomic(TEXT, UUID) TO service_role;
