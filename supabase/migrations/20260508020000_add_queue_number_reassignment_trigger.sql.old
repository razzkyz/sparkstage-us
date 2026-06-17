-- Add trigger to reassign queue_number when time_slot changes
-- This prevents unique constraint violations when rescheduling

-- Drop old trigger
drop trigger if exists purchased_tickets_assign_queue_number on public.purchased_tickets;

-- Create new trigger that runs on both INSERT and UPDATE (when time_slot changes)
create trigger purchased_tickets_assign_queue_number
before insert or update of time_slot on public.purchased_tickets
for each row
execute function public.assign_purchased_ticket_queue_number();
