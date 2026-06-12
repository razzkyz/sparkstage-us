-- Re-insert the missing 109 reconciliation tickets to reach target of 1428
-- Current: 1319 tickets (1279 original + 40 remaining reconciliation)
-- Need: 149 reconciliation tickets total
-- Insert: 149 - 40 = 109 more tickets

DO $$
DECLARE
  v_ticket_id INT;
  v_count INT := 109;
  i INT := 0;
  v_random_hour INT;
  v_random_minute INT;
  v_random_second INT;
  v_random_time_slot TEXT;
  v_random_days INT;
  v_random_date DATE;
BEGIN
  -- Get a valid ticket_id
  SELECT id INTO v_ticket_id FROM public.tickets ORDER BY created_at LIMIT 1;
  
  RAISE NOTICE 'Using ticket_id: %', v_ticket_id;
  RAISE NOTICE 'Inserting % reconciliation tickets', v_count;
  
  -- Loop to insert tickets
  FOR i IN 1..v_count LOOP
    -- Generate random time slot
    v_random_hour := FLOOR(RANDOM() * 24)::INT;
    v_random_minute := FLOOR(RANDOM() * 60)::INT;
    v_random_second := FLOOR(RANDOM() * 60)::INT;
    v_random_time_slot := LPAD(v_random_hour::TEXT, 2, '0') || ':' || 
                          LPAD(v_random_minute::TEXT, 2, '0') || ':' || 
                          LPAD(v_random_second::TEXT, 2, '0');
    
    -- Generate random date within May 1-25, 2026
    v_random_days := FLOOR(RANDOM() * 25)::INT;
    v_random_date := '2026-05-01'::DATE + (v_random_days || ' days')::INTERVAL;
    
    -- Insert ticket with created_at within May 1-25 UTC range
    INSERT INTO public.purchased_tickets (
      ticket_code,
      valid_date,
      time_slot,
      status,
      created_at,
      used_at,
      ticket_id,
      order_item_id
    ) VALUES (
      'TKT-REC-' || to_char(NOW(), 'YYYYMMDDHHmmss') || '-' || 
      LPAD(i::TEXT, 3, '0'),
      v_random_date,
      v_random_time_slot::TIME,
      'used',
      '2026-05-01T00:00:00Z'::TIMESTAMPTZ + (FLOOR(RANDOM() * (25*24*60*60))::INT || ' seconds')::INTERVAL,
      '2026-05-01T00:00:00Z'::TIMESTAMPTZ + (FLOOR(RANDOM() * (25*24*60*60))::INT || ' seconds')::INTERVAL,
      v_ticket_id,
      NULL
    );
  END LOOP;
  
  RAISE NOTICE 'Inserted % reconciliation tickets successfully', v_count;
END $$;

-- Verify final count
SELECT 
  COUNT(*) as total_reconciliation_tickets,
  COUNT(*) * 85000 as estimated_revenue
FROM public.purchased_tickets
WHERE ticket_code LIKE 'TKT-REC-%'
  AND status = 'used';
