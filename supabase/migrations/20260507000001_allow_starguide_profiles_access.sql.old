-- Allow starguide to read all profiles
-- Starguide staff need profile access to display customer names

-- Create helper function to check if user is admin or starguide
create or replace function public.is_admin_or_starguide()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_role_assignments ura
    where ura.user_id = (select auth.uid())
      and ura.role_name in ('admin', 'starguide')
  );
$$;

-- Update profiles RLS policy to allow starguide to read all profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin_or_starguide
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin_or_starguide());
