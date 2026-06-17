-- Fix: Calculate available capacity based on sold tickets only, not reserved
-- Previously: available = total - reserved - sold
-- Now: available = total - sold (reserved is for checkouts in progress)

DROP FUNCTION IF EXISTS public.list_effective_ticket_availabilities(BIGINT, DATE, DATE) CASCADE;

CREATE OR REPLACE FUNCTION public.list_effective_ticket_availabilities(
  p_ticket_id BIGINT,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  ticket_id BIGINT,
  date DATE,
  time_slot TIME WITHOUT TIME ZONE,
  base_total_capacity BIGINT,
  effective_total_capacity BIGINT,
  reserved_capacity BIGINT,
  sold_capacity BIGINT,
  available_capacity BIGINT,
  is_closed BOOLEAN,
  reason TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH slot_overrides AS (
    SELECT
      o.ticket_id,
      o.date,
      o.time_slot,
      o.is_closed,
      o.capacity_override,
      o.reason
    FROM public.ticket_availability_overrides o
    WHERE o.ticket_id = p_ticket_id
      AND o.time_slot IS NOT NULL
  ),
  date_level_overrides AS (
    SELECT
      o.ticket_id,
      o.date,
      o.is_closed,
      o.capacity_override,
      o.reason
    FROM public.ticket_availability_overrides o
    WHERE o.ticket_id = p_ticket_id
      AND o.time_slot IS NULL
  )
  SELECT
    ta.id,
    ta.ticket_id,
    ta.date,
    ta.time_slot,
    ta.total_capacity AS base_total_capacity,
    COALESCE(so.capacity_override, dlo.capacity_override, ta.total_capacity) AS effective_total_capacity,
    ta.reserved_capacity,
    ta.sold_capacity,
    CASE
      WHEN COALESCE(so.is_closed, dlo.is_closed, false) THEN 0
      ELSE GREATEST(
        COALESCE(so.capacity_override, dlo.capacity_override, ta.total_capacity) - ta.sold_capacity,
        0
      )
    END AS available_capacity,
    COALESCE(so.is_closed, dlo.is_closed, false) AS is_closed,
    COALESCE(so.reason, dlo.reason) AS reason
  FROM public.ticket_availabilities ta
  LEFT JOIN slot_overrides so
    ON so.ticket_id = ta.ticket_id
   AND so.date = ta.date
   AND so.time_slot = ta.time_slot
  LEFT JOIN date_level_overrides dlo
    ON dlo.ticket_id = ta.ticket_id
   AND dlo.date = ta.date
  WHERE ta.ticket_id = p_ticket_id
    AND (p_start_date IS NULL OR ta.date >= p_start_date)
    AND (p_end_date IS NULL OR ta.date <= p_end_date)
  ORDER BY ta.date ASC, ta.time_slot ASC;
$$;

GRANT EXECUTE ON FUNCTION public.list_effective_ticket_availabilities(BIGINT, DATE, DATE) TO anon, authenticated, service_role;
