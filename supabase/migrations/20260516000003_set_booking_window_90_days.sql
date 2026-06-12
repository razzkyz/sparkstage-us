-- Update booking_window_days to 90 (3 months) for the entrance ticket
UPDATE public.ticket_booking_settings
SET booking_window_days = 90
WHERE ticket_id = (
  SELECT id FROM public.tickets WHERE type = 'entrance' LIMIT 1
);
