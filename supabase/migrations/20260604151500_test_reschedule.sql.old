CREATE OR REPLACE FUNCTION public.test_reschedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pt RECORD;
BEGIN
  -- Find an active ticket on 4th June, 15:00
  SELECT * INTO pt FROM public.purchased_tickets WHERE valid_date = '2026-06-04' AND time_slot = '15:00' AND status = 'active' LIMIT 1;
  IF FOUND THEN
    -- Reschedule it to 5th June, 15:00
    UPDATE public.purchased_tickets SET valid_date = '2026-06-05' WHERE id = pt.id;
  END IF;
END;
$$;
