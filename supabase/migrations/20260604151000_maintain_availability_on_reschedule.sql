-- Migration: maintain_ticket_availability_on_reschedule
-- Purpose: Keep `ticket_availabilities.sold_capacity` in sync when `purchased_tickets` date/time/status changes

CREATE OR REPLACE FUNCTION public.maintain_ticket_availability_on_reschedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We only care if status, valid_date, or time_slot changes
  IF OLD.valid_date = NEW.valid_date AND 
     OLD.time_slot IS NOT DISTINCT FROM NEW.time_slot AND 
     OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- 1. Decrease sold_capacity on the old slot IF it was previously active/used
  IF OLD.status IN ('active', 'used') THEN
    UPDATE public.ticket_availabilities
    SET sold_capacity = greatest(sold_capacity - 1, 0),
        updated_at = now()
    WHERE ticket_id = OLD.ticket_id
      AND date = OLD.valid_date
      AND time_slot IS NOT DISTINCT FROM (OLD.time_slot::time);
  END IF;

  -- 2. Increase sold_capacity on the new slot IF it is now active/used
  IF NEW.status IN ('active', 'used') THEN
    UPDATE public.ticket_availabilities
    SET sold_capacity = sold_capacity + 1,
        updated_at = now()
    WHERE ticket_id = NEW.ticket_id
      AND date = NEW.valid_date
      AND time_slot IS NOT DISTINCT FROM (NEW.time_slot::time);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS purchased_tickets_maintain_availability ON public.purchased_tickets;

CREATE TRIGGER purchased_tickets_maintain_availability
AFTER UPDATE OF valid_date, time_slot, status ON public.purchased_tickets
FOR EACH ROW
EXECUTE FUNCTION public.maintain_ticket_availability_on_reschedule();
