-- Access hardening for real payment ledger: require explicit payment-admin membership.
create table if not exists public.ql_payment_admins (
  user_id uuid primary key references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.ql_payment_admins enable row level security;
revoke all on public.ql_payment_admins from anon, authenticated;
grant select on public.ql_payment_admins to authenticated;
create policy ql_admins_read_self on public.ql_payment_admins for select to authenticated using (user_id=(select auth.uid()));
-- Existing academy admin is initial payment administrator.
insert into public.ql_payment_admins(user_id)
select user_id from public.academy_admins on conflict do nothing;
-- Existing owner-only policies are replaced with owner + administrator checks.
drop policy if exists ql_families_select_owner on public.ql_families;
drop policy if exists ql_families_insert_owner on public.ql_families;
drop policy if exists ql_families_update_owner on public.ql_families;
drop policy if exists ql_accounts_select_owner on public.ql_payment_accounts;
drop policy if exists ql_accounts_insert_owner on public.ql_payment_accounts;
drop policy if exists ql_accounts_update_owner on public.ql_payment_accounts;
drop policy if exists ql_transactions_select_owner on public.ql_payment_transactions;
drop policy if exists ql_transactions_insert_owner on public.ql_payment_transactions;
create policy ql_families_select_owner on public.ql_families for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
create policy ql_families_insert_owner on public.ql_families for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
create policy ql_families_update_owner on public.ql_families for update to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid()))) with check (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
create policy ql_accounts_select_owner on public.ql_payment_accounts for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
create policy ql_accounts_insert_owner on public.ql_payment_accounts for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
create policy ql_accounts_update_owner on public.ql_payment_accounts for update to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid()))) with check (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
create policy ql_transactions_select_owner on public.ql_payment_transactions for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
create policy ql_transactions_insert_owner on public.ql_payment_transactions for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.ql_payment_admins where user_id=(select auth.uid())));
