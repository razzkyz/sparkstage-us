-- Allow starguide role to update time_slot in purchased_tickets
-- Starguide staff need to reschedule tickets between sessions on the same day

-- Drop old update policy
drop policy if exists purchased_tickets_update_admin on public.purchased_tickets;

-- Create new policy that allows update for admin or starguide (time_slot only)
create policy purchased_tickets_update_time_slot_admin_or_starguide
  on public.purchased_tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_role_assignments
      where user_id = (select auth.uid())
        and role_name in ('admin', 'starguide')
    )
  )
  with check (
    exists (
      select 1 from public.user_role_assignments
      where user_id = (select auth.uid())
        and role_name in ('admin', 'starguide')
    )
  );
