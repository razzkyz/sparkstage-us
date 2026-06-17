-- Migration: Fix release_ticket_capacity TIME casting
-- Date: 2026-05-21
-- Description: Handle NULL and empty string properly before casting to TIME

CREATE OR REPLACE FUNCTION public.release_ticket_capacity(
  p_ticket_id bigint,
  p_date date,
  p_time_slot text,
  p_quantity integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time_slot time;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN false;
  END IF;

  -- Safely convert time_slot, handling NULL and empty strings
  IF p_time_slot IS NULL OR TRIM(p_time_slot) = '' THEN
    v_time_slot := NULL;
  ELSE
    BEGIN
      v_time_slot := p_time_slot::time;
    EXCEPTION WHEN OTHERS THEN
      -- If casting fails, treat as NULL (all-day)
      v_time_slot := NULL;
    END;
  END IF;

  UPDATE public.ticket_availabilities
  SET reserved_capacity = greatest(reserved_capacity - p_quantity, 0),
      updated_at = now()
  WHERE ticket_id = p_ticket_id
    AND date = p_date
    AND time_slot IS NOT DISTINCT FROM v_time_slot;

  RETURN FOUND;
END;
$$;

-- Also fix finalize_ticket_capacity
CREATE OR REPLACE FUNCTION public.finalize_ticket_capacity(
  p_ticket_id bigint,
  p_date date,
  p_time_slot text,
  p_quantity integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_time_slot time;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN false;
  END IF;

  -- Safely convert time_slot, handling NULL and empty strings
  IF p_time_slot IS NULL OR TRIM(p_time_slot) = '' THEN
    v_time_slot := NULL;
  ELSE
    BEGIN
      v_time_slot := p_time_slot::time;
    EXCEPTION WHEN OTHERS THEN
      -- If casting fails, treat as NULL (all-day)
      v_time_slot := NULL;
    END;
  END IF;

  UPDATE public.ticket_availabilities
  SET reserved_capacity = greatest(reserved_capacity - p_quantity, 0),
      sold_capacity = sold_capacity + p_quantity,
      updated_at = now()
  WHERE ticket_id = p_ticket_id
    AND date = p_date
    AND time_slot IS NOT DISTINCT FROM v_time_slot;

  RETURN FOUND;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.release_ticket_capacity(bigint, date, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_ticket_capacity(bigint, date, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_ticket_capacity(bigint, date, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_ticket_capacity(bigint, date, text, integer) TO service_role;
