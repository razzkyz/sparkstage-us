-- Add availability for all Mondays from July to December 2026
-- Only for morning (09:00-11:30) and afternoon (12:00-14:30) time slots

-- First, let's find the entrance ticket ID
DO $$
DECLARE
  v_ticket_id BIGINT;
  v_start_date DATE := '2026-07-01';
  v_end_date DATE := '2026-12-31';
  v_capacity INTEGER := 100;
BEGIN
  -- Get the entrance ticket ID (type = 'entrance')
  SELECT id INTO v_ticket_id
  FROM public.tickets
  WHERE type = 'entrance'
  LIMIT 1;

  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'No entrance ticket found';
  END IF;

  -- Get default capacity from ticket_booking_settings
  SELECT default_slot_capacity INTO v_capacity
  FROM public.ticket_booking_settings
  WHERE ticket_id = v_ticket_id;

  IF v_capacity IS NULL OR v_capacity <= 0 THEN
    v_capacity := 100;
  END IF;

  RAISE NOTICE 'Generating availability for ticket ID: %, capacity: %', v_ticket_id, v_capacity;

  -- Insert availability for all Mondays with specific time slots
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
    monday_date::DATE,
    time_slot::TIME,
    v_capacity,
    0,
    0,
    0,
    NOW(),
    NOW()
  FROM generate_series(v_start_date, v_end_date, INTERVAL '1 day') AS monday_date
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
  ) AS t(time_slot)
  WHERE EXTRACT(DOW FROM monday_date) = 1 -- Monday = 1 in PostgreSQL
  ON CONFLICT (ticket_id, date, time_slot) DO NOTHING;

  RAISE NOTICE 'Availability inserted successfully for Mondays July-December 2026';
END $$;
