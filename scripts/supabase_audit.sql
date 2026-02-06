\echo '=== Schemas (non-system) ==='
select nspname
from pg_namespace
where nspname not like 'pg_%'
  and nspname not in ('information_schema')
order by 1;

\echo '=== Extensions ==='
select extname, extversion from pg_extension order by 1;

\echo '=== Tables (non-system) ==='
select schemaname, tablename
from pg_tables
where schemaname not like 'pg_%'
  and schemaname <> 'information_schema'
order by 1,2;

\echo '=== Views (non-system) ==='
select schemaname, viewname
from pg_views
where schemaname not like 'pg_%'
  and schemaname <> 'information_schema'
order by 1,2;

\echo '=== Functions (non-system) ==='
select n.nspname as schema, p.proname as function
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname not like 'pg_%'
  and n.nspname <> 'information_schema'
order by 1,2;

\echo '=== Triggers (non-system) ==='
select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema not like 'pg_%'
  and event_object_schema <> 'information_schema'
order by 1,2,3;

\echo '=== RLS Policies ==='
select schemaname, tablename, policyname, cmd
from pg_policies
order by 1,2,3;

\echo '=== Auth user count (if auth schema exists) ==='
do $$
begin
  if exists (select 1 from pg_namespace where nspname='auth') then
    raise notice 'auth.users count: %', (select count(*) from auth.users);
  else
    raise notice 'auth schema not present';
  end if;
end $$;

\echo '=== Profiles email coverage (if public.profiles exists) ==='
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema='public' and table_name='profiles'
  ) then
    if exists (
      select 1
      from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='email'
    ) then
      raise notice 'profiles: % total, % with email',
        (select count(*) from public.profiles),
        (select count(email) from public.profiles);
    else
      raise notice 'public.profiles exists but has no email column';
    end if;
  else
    raise notice 'public.profiles table not present';
  end if;
end $$;

\echo '=== Columns that look like user id references ==='
select table_schema, table_name, column_name, data_type
from information_schema.columns
where table_schema not like 'pg_%'
  and table_schema <> 'information_schema'
  and column_name ilike '%user%id%'
order by 1,2,3;

\echo '=== Cron jobs (if cron schema exists) ==='
do $$
begin
  if exists (select 1 from pg_namespace where nspname='cron') then
    raise notice 'cron.job count: %', (select count(*) from cron.job);
  else
    raise notice 'cron schema not present';
  end if;
end $$;

\echo '=== Storage buckets (if storage schema exists) ==='
do $$
begin
  if exists (select 1 from pg_namespace where nspname='storage') then
    raise notice 'storage.buckets count: %', (select count(*) from storage.buckets);
  else
    raise notice 'storage schema not present';
  end if;
end $$;

