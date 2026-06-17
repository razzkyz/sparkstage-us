-- Safety fix: wrap trigger body in exception handler
-- Capacity tracking must NEVER break ticket scanning or other core operations
-- If capacity update fails for any reason, log a warning but let the triggering operation succeed

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
  BEGIN
    -- Safely normalize time slots - guard against 'all-day', NULL, and non-time formats
    v_old_slot := CASE
      WHEN OLD.time_slot IS NULL THEN NULL
      WHEN OLD.time_slot = 'all-day' THEN NULL
      WHEN OLD.time_slot ~ '^\d{2}:\d{2}' THEN to_char(OLD.time_slot::time, 'HH24:MI:SS')
      ELSE NULL
    END;

    v_new_slot := CASE
      WHEN NEW.time_slot IS NULL THEN NULL
      WHEN NEW.time_slot = 'all-day' THEN NULL
      WHEN NEW.time_slot ~ '^\d{2}:\d{2}' THEN to_char(NEW.time_slot::time, 'HH24:MI:SS')
      ELSE NULL
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

  EXCEPTION WHEN OTHERS THEN
    -- Never block ticket scanning or other operations due to capacity tracking errors
    RAISE WARNING 'maintain_ticket_availability_on_reschedule failed (non-fatal): % - ticket_id=%, old_date=%, new_date=%, old_slot=%, new_slot=%, old_status=%, new_status=%',
      SQLERRM,
      OLD.ticket_id,
      OLD.valid_date,
      NEW.valid_date,
      OLD.time_slot,
      NEW.time_slot,
      OLD.status,
      NEW.status;
  END;

  RETURN NEW;
END;
$$;
