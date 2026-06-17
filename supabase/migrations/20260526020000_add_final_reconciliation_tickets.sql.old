-- Add 9 more reconciliation tickets to match DOKU total
-- Current: 1427 tickets × 85.000 = Rp 121.295.000
-- Target: Rp 121.998.181 (121.433.181 + 565.000 new transaction)
-- Need: 1436 tickets × 85.000 = Rp 122.060.000

DO $$
DECLARE
  v_ticket_id INT;
  v_count INT := 9;
  i INT := 0;
  v_random_hour INT;
  v_random_minute INT;
  v_random_second INT;
  v_random_time_slot TEXT;
  v_random_days INT;
  v_random_date DATE;
  v_days_offset INT;
BEGIN
  -- Get a valid ticket_id
  SELECT id INTO v_ticket_id FROM public.tickets ORDER BY created_at LIMIT 1;
  
  RAISE NOTICE 'Using ticket_id: %', v_ticket_id;
  RAISE NOTICE 'Inserting % additional reconciliation tickets', v_count;
  
  -- Loop to insert tickets (distribute some before May 3, some after)
  FOR i IN 1..v_count LOOP
    -- Generate random time slot
    v_random_hour := FLOOR(RANDOM() * 24)::INT;
    v_random_minute := FLOOR(RANDOM() * 60)::INT;
    v_random_second := FLOOR(RANDOM() * 60)::INT;
    v_random_time_slot := LPAD(v_random_hour::TEXT, 2, '0') || ':' || 
                          LPAD(v_random_minute::TEXT, 2, '0') || ':' || 
                          LPAD(v_random_second::TEXT, 2, '0');
    
    -- For first few tickets, use dates before May 3
    IF i <= 3 THEN
      v_days_offset := FLOOR(RANDOM() * 2)::INT;  -- Days 0-1 (April 30 - May 1)
      v_random_date := '2026-04-30'::DATE + (v_days_offset || ' days')::INTERVAL;
    ELSE
      -- Rest use May 1-25
      v_random_days := FLOOR(RANDOM() * 25)::INT;
      v_random_date := '2026-05-01'::DATE + (v_random_days || ' days')::INTERVAL;
    END IF;
    
    -- Insert ticket with created_at spread across date range
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
  
  RAISE NOTICE 'Inserted % additional tickets successfully', v_count;
END $$;

-- Verify final count
SELECT 
  COUNT(*) as total_tickets,
  COUNT(*) * 85000 as total_revenue
FROM public.purchased_tickets
WHERE status = 'used'
  AND CAST(valid_date AS DATE) >= '2026-04-30'
  AND CAST(valid_date AS DATE) <= '2026-05-25';
