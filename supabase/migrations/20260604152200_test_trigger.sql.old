CREATE OR REPLACE FUNCTION public.test_trigger_end_to_end()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_ticket_id INT;
  v_pt_id INT;
  v_cap1_before INT;
  v_cap1_after INT;
  v_cap2_before INT;
  v_cap2_after INT;
BEGIN
  -- get random user
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN '{"error": "no user"}'::jsonb;
  END IF;

  v_ticket_id := 1;

  -- Ensure rows exist
  INSERT INTO public.ticket_availabilities (ticket_id, date, time_slot, total_capacity, sold_capacity)
  VALUES (1, '2026-10-10', '15:00:00', 100, 0)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.ticket_availabilities (ticket_id, date, time_slot, total_capacity, sold_capacity)
  VALUES (1, '2026-10-11', '15:00:00', 100, 0)
  ON CONFLICT DO NOTHING;

  -- Get before
  SELECT sold_capacity INTO v_cap1_before FROM public.ticket_availabilities WHERE date = '2026-10-10' AND time_slot = '15:00:00';
  SELECT sold_capacity INTO v_cap2_before FROM public.ticket_availabilities WHERE date = '2026-10-11' AND time_slot = '15:00:00';

  -- Insert purchased ticket
  INSERT INTO public.purchased_tickets (ticket_id, user_id, valid_date, time_slot, status)
  VALUES (1, v_user_id, '2026-10-10', '15:00', 'active')
  RETURNING id INTO v_pt_id;

  -- Update to trigger my logic
  UPDATE public.purchased_tickets SET valid_date = '2026-10-11' WHERE id = v_pt_id;

  -- Get after
  SELECT sold_capacity INTO v_cap1_after FROM public.ticket_availabilities WHERE date = '2026-10-10' AND time_slot = '15:00:00';
  SELECT sold_capacity INTO v_cap2_after FROM public.ticket_availabilities WHERE date = '2026-10-11' AND time_slot = '15:00:00';

  -- Cleanup
  DELETE FROM public.purchased_tickets WHERE id = v_pt_id;

  RETURN jsonb_build_object(
    'cap1_before', v_cap1_before,
    'cap1_after', v_cap1_after,
    'cap2_before', v_cap2_before,
    'cap2_after', v_cap2_after
  );
END;
$$;
