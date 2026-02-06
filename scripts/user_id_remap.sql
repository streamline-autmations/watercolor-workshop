\echo 'Create staging table for OLD auth user ids + emails'
create table if not exists public.tmp_old_auth_users (
  old_id uuid primary key,
  email text not null
);

\echo 'Load old_auth_users.csv (id,email) into tmp_old_auth_users'
\echo 'Example: \\copy public.tmp_old_auth_users(old_id,email) from ''old_auth_users.csv'' csv header'

\echo 'Build mapping to NEW auth.users by email'
drop table if exists public.tmp_user_id_map;
create table public.tmp_user_id_map as
select o.old_id, u.id as new_id, o.email
from public.tmp_old_auth_users o
join auth.users u on lower(u.email) = lower(o.email);

create index if not exists tmp_user_id_map_old_id_idx on public.tmp_user_id_map(old_id);
create index if not exists tmp_user_id_map_new_id_idx on public.tmp_user_id_map(new_id);

\echo 'Generate update statements for uuid columns that look like user id references'
select format(
  'update %I.%I set %I = m.new_id from public.tmp_user_id_map m where %I = m.old_id;',
  c.table_schema,
  c.table_name,
  c.column_name,
  c.column_name
) as sql
from information_schema.columns c
where c.table_schema not like 'pg_%'
  and c.table_schema <> 'information_schema'
  and c.table_schema not in ('auth','storage','realtime','supabase_functions','extensions','graphql_public','pgbouncer','pgsodium','net','vault','cron')
  and c.data_type = 'uuid'
  and c.column_name ilike '%user%id%'
  and not (c.table_schema='public' and c.table_name in ('tmp_old_auth_users','tmp_user_id_map'))
order by c.table_schema, c.table_name, c.column_name;

