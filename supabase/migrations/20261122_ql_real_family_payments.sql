-- QuranLearn: isolated production payment ledger. No destructive operations.
-- Apply only after confirming the correct Supabase project and taking a backup.
create table if not exists public.ql_families (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 200),
  phone text,
  notes text,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index if not exists ql_families_owner_idx on public.ql_families(owner_id);
create table if not exists public.ql_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  family_id uuid not null,
  expected_amount_som bigint not null default 0 check (expected_amount_som >= 0),
  status text not null default 'pending' check (status in ('pending','reserved','partial','paid')),
  notes text,
  created_at timestamptz not null default now(),
  unique (owner_id, family_id),
  foreign key (family_id, owner_id) references public.ql_families(id, owner_id)
);
create table if not exists public.ql_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  family_id uuid not null,
  amount_som bigint not null check (amount_som <> 0),
  paid_on date not null default current_date,
  method text not null default 'transfer' check (method in ('transfer','cash','other')),
  comment text not null default '',
  reverses_transaction_id uuid references public.ql_payment_transactions(id),
  created_at timestamptz not null default now(),
  foreign key (family_id, owner_id) references public.ql_families(id, owner_id)
);
create index if not exists ql_payment_transactions_family_idx on public.ql_payment_transactions(family_id,paid_on desc);
-- Ledger is append-only: corrections are separate compensating transactions.
alter table public.ql_families enable row level security;
alter table public.ql_payment_accounts enable row level security;
alter table public.ql_payment_transactions enable row level security;
revoke all on public.ql_families,public.ql_payment_accounts,public.ql_payment_transactions from anon;
grant select,insert,update on public.ql_families,public.ql_payment_accounts to authenticated;
grant select,insert on public.ql_payment_transactions to authenticated;
create policy "ql_families_select_owner" on public.ql_families for select to authenticated using ((select auth.uid()) = owner_id);
create policy "ql_families_insert_owner" on public.ql_families for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "ql_families_update_owner" on public.ql_families for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "ql_accounts_select_owner" on public.ql_payment_accounts for select to authenticated using ((select auth.uid()) = owner_id);
create policy "ql_accounts_insert_owner" on public.ql_payment_accounts for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "ql_accounts_update_owner" on public.ql_payment_accounts for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "ql_transactions_select_owner" on public.ql_payment_transactions for select to authenticated using ((select auth.uid()) = owner_id);
create policy "ql_transactions_insert_owner" on public.ql_payment_transactions for insert to authenticated with check ((select auth.uid()) = owner_id);
-- No UPDATE/DELETE policy for transactions.
