-- ============================================================
-- Tabel laporan penjualan kaos kaki (input manual StarGuide)
-- ============================================================

create table if not exists public.sock_sales_reports (
  id               bigserial primary key,
  report_date      date        not null,
  stock_awal       integer     not null check (stock_awal >= 0),
  terjual          integer     not null check (terjual >= 0),
  sisa             integer     generated always as (stock_awal - terjual) stored,
  harga_per_pasang integer     not null default 5000 check (harga_per_pasang > 0),
  total            integer     generated always as (terjual * harga_per_pasang) stored,
  catatan          text,
  created_by       uuid        references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- Satu laporan per hari
  unique (report_date)
);

-- RLS
alter table public.sock_sales_reports enable row level security;

-- Admin & StarGuide bisa baca semua
create policy "sock_reports_select"
  on public.sock_sales_reports for select
  to authenticated
  using (true);

-- Admin & StarGuide bisa insert
create policy "sock_reports_insert"
  on public.sock_sales_reports for insert
  to authenticated
  with check (true);

-- Admin & StarGuide bisa update
create policy "sock_reports_update"
  on public.sock_sales_reports for update
  to authenticated
  using (true);

-- Admin bisa delete
create policy "sock_reports_delete"
  on public.sock_sales_reports for delete
  to authenticated
  using (true);

-- Trigger auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sock_sales_reports_updated_at
  before update on public.sock_sales_reports
  for each row execute function public.set_updated_at();

comment on table public.sock_sales_reports is 'Laporan penjualan kaos kaki harian — diinput manual oleh StarGuide';
