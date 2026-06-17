-- Fix: normalize time_slot format before comparing
-- purchased_tickets.time_slot stores '15:00' (HH:MM)
-- ticket_availabilities.time_slot stores '15:00:00' (HH:MM:SS)
-- Solution: cast both sides through ::time to normalize, then compare as text in HH:MM:SS

CREATE OR REPLACE FUNCTION public.maintain_ticket_availability_on_reschedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_slot TEXT;
  v_new_slot TEXT;
BEGIN
  -- Normalize time slots to HH:MM:SS text by casting through ::time
  -- This handles '15:00', '15:00:00', etc. uniformly
  v_old_slot := CASE
    WHEN OLD.time_slot IS NULL THEN NULL
    ELSE to_char(OLD.time_slot::time, 'HH24:MI:SS')
  END;

  v_new_slot := CASE
    WHEN NEW.time_slot IS NULL THEN NULL
    ELSE to_char(NEW.time_slot::time, 'HH24:MI:SS')
  END;

  -- Skip if nothing relevant changed
  IF OLD.valid_date = NEW.valid_date AND
     v_old_slot IS NOT DISTINCT FROM v_new_slot AND
     OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 1. Decrease sold_capacity on old slot if it was active/used
  IF OLD.status IN ('active', 'used') THEN
    UPDATE public.ticket_availabilities
    SET sold_capacity = greatest(sold_capacity - 1, 0),
        updated_at = now()
    WHERE ticket_id = OLD.ticket_id
      AND date = OLD.valid_date
      AND time_slot IS NOT DISTINCT FROM v_old_slot;
  END IF;

  -- 2. Increase sold_capacity on new slot if it is now active/used
  IF NEW.status IN ('active', 'used') THEN
    UPDATE public.ticket_availabilities
    SET sold_capacity = sold_capacity + 1,
        updated_at = now()
    WHERE ticket_id = NEW.ticket_id
      AND date = NEW.valid_date
      AND time_slot IS NOT DISTINCT FROM v_new_slot;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-create trigger (function already updated above)
DROP TRIGGER IF EXISTS purchased_tickets_maintain_availability ON public.purchased_tickets;

CREATE TRIGGER purchased_tickets_maintain_availability
AFTER UPDATE OF valid_date, time_slot, status ON public.purchased_tickets
FOR EACH ROW
EXECUTE FUNCTION public.maintain_ticket_availability_on_reschedule();
