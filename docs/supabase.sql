-- Plate Log: run this once in Supabase (SQL Editor -> New query -> paste -> Run).
-- One table holds every user's sessions and plan. Row Level Security means each
-- signed-in user can only ever read or change their own rows.

create table if not exists public.docs (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id         text not null check (char_length(id) between 1 and 80),
  data       jsonb not null check (octet_length(data::text) < 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.docs enable row level security;

drop policy if exists "docs_select_own" on public.docs;
drop policy if exists "docs_insert_own" on public.docs;
drop policy if exists "docs_update_own" on public.docs;
drop policy if exists "docs_delete_own" on public.docs;

create policy "docs_select_own" on public.docs for select to authenticated
  using (user_id = (select auth.uid()));
create policy "docs_insert_own" on public.docs for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "docs_update_own" on public.docs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "docs_delete_own" on public.docs for delete to authenticated
  using (user_id = (select auth.uid()));

-- Anonymous (not signed in) visitors get no access at all.
revoke all on public.docs from anon;
grant select, insert, update, delete on public.docs to authenticated;
