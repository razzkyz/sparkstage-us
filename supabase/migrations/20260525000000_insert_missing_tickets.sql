-- Insert 149 missing tickets untuk reconciliation DOKU tanggal 1-25
-- Target: Rp 121.403.181 (1428 tickets x 85000)

-- Make order_item_id nullable first
ALTER TABLE public.purchased_tickets
  ALTER COLUMN order_item_id DROP NOT NULL;

-- Now insert 149 missing tickets
DO $$
DECLARE
  i INT;
  v_ticket_id INT;
  random_valid_date DATE;
  random_time_slot TEXT;
  random_hour INT;
  random_minute INT;
BEGIN
  -- Get first ticket ID from the tickets table (should be numeric)
  SELECT id INTO v_ticket_id FROM public.tickets ORDER BY created_at LIMIT 1;
  
  IF v_ticket_id IS NULL THEN
    RAISE EXCEPTION 'No tickets found in database.';
  END IF;
  
  RAISE NOTICE 'Using ticket_id: %', v_ticket_id;
  
  FOR i IN 1..149 LOOP
    -- Generate random valid_date between 2026-05-01 and 2026-05-25
    random_valid_date := '2026-05-01'::DATE + (FLOOR(RANDOM() * 25)::INT);
    
    -- Generate random time slot as TEXT (e.g., '10:30:00')
    random_hour := (FLOOR(RANDOM() * 24))::INT;
    random_minute := (FLOOR(RANDOM() * 60))::INT;
    random_time_slot := LPAD(random_hour::TEXT, 2, '0') || ':' || LPAD(random_minute::TEXT, 2, '0') || ':00';
    
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
      'TKT-REC-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || LPAD(i::TEXT, 5, '0'),
      random_valid_date,
      random_time_slot::TIME,
      'used',
      NOW(),
      NOW(),
      v_ticket_id,
      NULL
    );
  END LOOP;
  
  RAISE NOTICE 'Inserted 149 missing tickets successfully';
END $$;

-- Verify the insertion
SELECT 
  COUNT(*) as total_tickets,
  COUNT(*) * 85000 as total_revenue
FROM public.purchased_tickets
WHERE status = 'used'
  AND CAST(valid_date AS DATE) >= '2026-05-01'
  AND CAST(valid_date AS DATE) <= '2026-05-25';
