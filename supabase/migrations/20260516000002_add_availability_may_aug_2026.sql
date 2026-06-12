-- Add availability for all days from 2026-05-16 to 2026-08-16
-- Covers the full 3-month window from today
-- Time slots match existing Monday July-Dec pattern

DO $$
DECLARE
  v_ticket_id BIGINT;
  v_start_date DATE := '2026-05-16';
  v_end_date   DATE := '2026-08-16';
  v_capacity   INTEGER := 100;
BEGIN
  -- Get the entrance ticket ID
  SELECT id INTO v_ticket_id
  FROM public.tickets
  WHERE type = 'entrance'
  LIMIT 1;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'No entrance ticket found';
  END IF;

  -- Use default_slot_capacity from settings if available
  SELECT COALESCE(default_slot_capacity, 100) INTO v_capacity
  FROM public.ticket_booking_settings
  WHERE ticket_id = v_ticket_id;

  IF v_capacity IS NULL OR v_capacity <= 0 THEN
    v_capacity := 100;
  END IF;

  RAISE NOTICE 'Generating 3-month availability for ticket ID: %, capacity: %', v_ticket_id, v_capacity;

  -- Insert for ALL days in the range, all time slots
  INSERT INTO public.ticket_availabilities (
    ticket_id,
    date,
    time_slot,
    total_capacity,
    reserved_capacity,
    sold_capacity,
    version,
    created_at,
    updated_at
  )
  SELECT
    v_ticket_id,
    d::DATE,
    ts::TIME,
    v_capacity,
    0,
    0,
    0,
    NOW(),
    NOW()
  FROM generate_series(v_start_date, v_end_date, INTERVAL '1 day') AS d
  CROSS JOIN (VALUES
    ('09:00'),
    ('09:30'),
    ('10:00'),
    ('10:30'),
    ('11:00'),
    ('11:30'),
    ('12:00'),
    ('12:30'),
    ('13:00'),
    ('13:30'),
    ('14:00'),
    ('14:30')
  ) AS t(ts)
  ON CONFLICT (ticket_id, date, time_slot) DO NOTHING;

  RAISE NOTICE 'Availability inserted successfully for May 16 - Aug 16 2026';
END $$;
