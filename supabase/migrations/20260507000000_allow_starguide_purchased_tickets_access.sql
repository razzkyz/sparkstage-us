-- Allow starguide role to view all purchased_tickets
-- Starguide staff need access to all tickets for scanning/validation purposes

-- Drop old policy
drop policy if exists purchased_tickets_select_own_or_admin on public.purchased_tickets;

-- Create new policy that allows select for admin or starguide
create policy purchased_tickets_select_own_or_admin_or_starguide
  on public.purchased_tickets
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.user_role_assignments
      where user_id = (select auth.uid())
        and role_name in ('admin', 'starguide')
    )
  );

-- Keep update policy admin-only
drop policy if exists purchased_tickets_update_admin on public.purchased_tickets;
create policy purchased_tickets_update_admin
  on public.purchased_tickets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_role_assignments
      where user_id = (select auth.uid())
        and role_name = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_role_assignments
      where user_id = (select auth.uid())
        and role_name = 'admin'
    )
  );
