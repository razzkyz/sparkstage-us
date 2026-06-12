-- Allow admin, super_admin, devops to reschedule purchased_tickets (date + session)
-- Previously only admin & starguide could update, and only time_slot was guarded by trigger

-- 1. Drop old update policy and replace with one that includes devops & super_admin
drop policy if exists purchased_tickets_update_time_slot_admin_or_starguide on public.purchased_tickets;
drop policy if exists purchased_tickets_update_admin on public.purchased_tickets;

create policy purchased_tickets_update_admin_roles
  on public.purchased_tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_role_assignments
      where user_id = (select auth.uid())
        and role_name in ('admin', 'super_admin', 'starguide', 'devops')
    )
  )
  with check (
    exists (
      select 1 from public.user_role_assignments
      where user_id = (select auth.uid())
        and role_name in ('admin', 'super_admin', 'starguide', 'devops')
    )
  );

-- 2. Extend queue number trigger to also fire when valid_date changes
--    (so queue_number is reassigned correctly when date OR session changes)
drop trigger if exists purchased_tickets_assign_queue_number on public.purchased_tickets;

create trigger purchased_tickets_assign_queue_number
  before insert or update of time_slot, valid_date on public.purchased_tickets
  for each row
  execute function public.assign_purchased_ticket_queue_number();
