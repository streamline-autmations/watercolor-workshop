# Supabase Project Migration (Account A → Account B, Free → Free)

Goal: migrate one Supabase project while preserving schema, data, RLS, DB functions/triggers/views, storage buckets/files, and edge functions, then reconnect this repo so the app behaves the same.

Project refs (from this repo + your input):
- OLD: `udsrdgfhqfvrkmqghyyj` (`https://udsrdgfhqfvrkmqghyyj.supabase.co`)
- NEW: `khydacdmfnwfwytqdoei` (`https://khydacdmfnwfwytqdoei.supabase.co`)

Do not paste keys into Git. Use environment variables when running commands.

## Security note (rotate if leaked)

If you accidentally pasted or shared any of the following, assume compromise and rotate immediately in the Supabase dashboard:

- Service Role key
- Anon key
- Database password / pooler connection string

After rotation, update local env vars, Vercel env vars, and any automations (n8n) that call Supabase.

## Phase 1: Audit (capture what exists today)

### Inputs to collect (Dashboard)

- `OLD_DB_URL`, `NEW_DB_URL` (Postgres connection string for `postgres`)
- `OLD_SERVICE_ROLE_KEY`, `NEW_SERVICE_ROLE_KEY`
- `NEW_ANON_KEY`
- Auth settings in OLD: providers, SMTP, Site URL + redirect URLs, email templates
- Edge Function secrets in OLD
- Any external automations (n8n, webhooks) that call OLD URLs/keys

### Run DB audit queries (OLD first, then NEW after restore)

You can run the queries in [scripts/supabase_audit.sql](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/supabase_audit.sql).

Example (PowerShell):

```powershell
$OLD_DB_URL = "<paste old db url>"
psql "$OLD_DB_URL" -v ON_ERROR_STOP=1 -f scripts/supabase_audit.sql
```

### Edge Functions + secrets audit (CLI)

If you see `supabase : The term 'supabase' is not recognized`, install Supabase CLI first (Windows PowerShell):

```powershell
winget source update
winget search supabase
winget install --id Supabase.CLI -e --source winget
```

Close and reopen your terminal, then verify:

```powershell
supabase --version
```

If `winget` cannot find Supabase CLI on your machine, use one of these alternatives:

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
iwr -useb get.scoop.sh | iex
scoop install supabase
```

Or download the Windows binary from GitHub releases and put it on your PATH.

```bash
supabase login
supabase functions list --project-ref udsrdgfhqfvrkmqghyyj
supabase secrets list --project-ref udsrdgfhqfvrkmqghyyj
```

## Phase 2: DB migration (schema + data)

### If you do NOT need production data: prefer schema-only

If you are restarting clean (no meaningful users/orders), schema-only avoids foreign-key failures to `auth.users` and is the fastest safe path.

Note: `$env:OLD_DB_URL` and `$env:NEW_DB_URL` are per-terminal-session. If you open a new PowerShell window, you must set them again.

You can run the automated schema-only flow with:

```powershell
.\scripts\db_schema_only_migrate.ps1 -OldDbUrl "<old db url>" -NewDbUrl "<new db url>"
```

1) Reset NEW `public` schema (this removes old objects). This also removes schema grants, so re-apply baseline grants right away.

```powershell
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public;"
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -c "grant usage on schema public to anon, authenticated, service_role; grant all on schema public to postgres, service_role; alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated; alter default privileges in schema public grant usage, select on sequences to anon, authenticated; alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to service_role; alter default privileges in schema public grant all on sequences to service_role; alter default privileges in schema public grant execute on functions to service_role;"
```

2) Dump schema-only from OLD (exclude managed schemas):

```powershell
pg_dump "$OLD_DB_URL" --schema-only --no-publications --no-subscriptions --no-owner --no-acl --exclude-schema=auth --exclude-schema=storage --exclude-schema=realtime --exclude-schema=supabase_functions --exclude-schema=extensions --exclude-schema=graphql --exclude-schema=graphql_public --exclude-schema=net --exclude-schema=vault --exclude-schema=cron --exclude-schema=pgbouncer --exclude-schema=pgsodium --exclude-schema=supabase_migrations --format=plain --file old_schema.sql
```

If you see an error like `publication \"supabase_realtime\" already exists` during restore, your dump included publications. Re-dump with `--no-publications --no-subscriptions` and restore again.

If you see an error like `Non-superuser owned event trigger must execute a non-superuser owned function`, the schema dump includes extension-managed EVENT TRIGGERs. The repo script [db_schema_only_migrate.ps1](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/db_schema_only_migrate.ps1) automatically strips EVENT TRIGGER statements from the dump before restoring.

3) Restore into NEW and grant on existing objects:

```powershell
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -1 -f old_schema.sql
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -c "grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role; grant usage, select on all sequences in schema public to anon, authenticated, service_role; grant execute on all functions in schema public to anon, authenticated, service_role;"
```

Then continue with the post-restore diff checks below (policies, functions, required RPCs).

### Recommended dump (exclude managed schemas, not “public only”)

You can run the whole dump+restore+diff flow with [db_dump_restore.ps1](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/db_dump_restore.ps1):

```powershell
.\scripts\db_dump_restore.ps1 -OldDbUrl "<old db url>" -NewDbUrl "<new db url>"
```

Or run the commands manually:

```bash
pg_dump "$OLD_DB_URL" \
  --no-owner --no-acl \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=realtime \
  --exclude-schema=supabase_functions \
  --exclude-schema=extensions \
  --exclude-schema=graphql \
  --exclude-schema=graphql_public \
  --exclude-schema=pgbouncer \
  --exclude-schema=pgsodium \
  --exclude-schema=net \
  --exclude-schema=vault \
  --exclude-schema=cron \
  --exclude-schema=supabase_migrations \
  --format=plain \
  --file old_app.sql
```

If your audit shows custom objects inside an excluded schema (rare), adjust exclusions before dumping.

### Restore into NEW

```bash
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -1 -f old_app.sql
```

### Post-restore diff checks (must match OLD logically)

Policies diff:

```bash
psql "$OLD_DB_URL" -Atc "select schemaname, tablename, policyname, cmd from pg_policies order by 1,2,3;" > old_policies.txt
psql "$NEW_DB_URL" -Atc "select schemaname, tablename, policyname, cmd from pg_policies order by 1,2,3;" > new_policies.txt
```

Functions diff:

```bash
psql "$OLD_DB_URL" -Atc "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' order by 1,2;" > old_functions.txt
psql "$NEW_DB_URL" -Atc "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' order by 1,2;" > new_functions.txt
```

RPC presence (app depends on these):

```bash
psql "$NEW_DB_URL" -Atc "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('create_course_invite','claim_course_invite','enroll_user_by_id','create_user_profile_simple') order by 1;"
```

Optional RPC smoke test via script (uses service role; do not commit keys):

```bash
SUPABASE_URL="https://khydacdmfnwfwytqdoei.supabase.co" \
SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY" \
node scripts/rpc_smoke.mjs
```

## Phase 3: Storage migration (buckets + files)

The DB dump excludes the `storage` schema, so buckets/files must be migrated separately.

1) Audit buckets in OLD:

```bash
psql "$OLD_DB_URL" -Atc "select id, name, public, file_size_limit, allowed_mime_types from storage.buckets order by name;"
```

2) Copy buckets + objects with the script (service role keys required):

```bash
OLD_SUPABASE_URL="https://udsrdgfhqfvrkmqghyyj.supabase.co" \
NEW_SUPABASE_URL="https://khydacdmfnwfwytqdoei.supabase.co" \
OLD_SERVICE_ROLE_KEY="$OLD_SERVICE_ROLE_KEY" \
NEW_SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY" \
node scripts/storage_migrate.mjs --dry-run

OLD_SUPABASE_URL="https://udsrdgfhqfvrkmqghyyj.supabase.co" \
NEW_SUPABASE_URL="https://khydacdmfnwfwytqdoei.supabase.co" \
OLD_SERVICE_ROLE_KEY="$OLD_SERVICE_ROLE_KEY" \
NEW_SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY" \
node scripts/storage_migrate.mjs --concurrency 4
```

PowerShell wrapper (single command, no env var export needed):

```powershell
.\scripts\storage_migrate.ps1 -OldSupabaseUrl "https://udsrdgfhqfvrkmqghyyj.supabase.co" -NewSupabaseUrl "https://khydacdmfnwfwytqdoei.supabase.co" -OldServiceRoleKey "<old>" -NewServiceRoleKey "<new>" -DryRun
.\scripts\storage_migrate.ps1 -OldSupabaseUrl "https://udsrdgfhqfvrkmqghyyj.supabase.co" -NewSupabaseUrl "https://khydacdmfnwfwytqdoei.supabase.co" -OldServiceRoleKey "<old>" -NewServiceRoleKey "<new>" -Concurrency 4
```

If you see `StorageApiError: Invalid Compact JWS`, it means one of the keys is not a valid JWT (common causes: using the anon key, pasting the placeholder text, or copying with hidden newlines). Use the project’s Service Role key and retry.

## Phase 4: Edge Functions migration

Deploy `setup-user` to NEW:

```bash
supabase login
supabase functions deploy setup-user --project-ref khydacdmfnwfwytqdoei
```

PowerShell helper (does deploy + secrets set):

```powershell
.\scripts\edge_deploy.ps1 -ProjectRef "khydacdmfnwfwytqdoei" -ServiceRoleKey "<new service role key>"
```

Set secrets in NEW (values come from NEW project):

```bash
supabase secrets set --project-ref khydacdmfnwfwytqdoei \
  SB_URL="https://khydacdmfnwfwytqdoei.supabase.co" \
  SB_SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY"
```

Quick test (PowerShell):

```powershell
curl.exe -i -X OPTIONS "https://khydacdmfnwfwytqdoei.functions.supabase.co/setup-user"
curl.exe -i -X POST "https://khydacdmfnwfwytqdoei.functions.supabase.co/setup-user" -H "Authorization: Bearer <user access token>" -H "Content-Type: application/json" -d "{\"password\":\"TempPass123!\",\"firstName\":\"Test\",\"lastName\":\"User\",\"phone\":\"0000000000\"}"
```

## Phase 5: Auth users (limitations + safest workaround)

### Limitation

Supabase Auth does not provide a supported way to migrate password hashes. The safest approach is:
- recreate users in NEW
- send password reset / invite flows so users set a new password
- remap DB `user_id` references if production data already exists

### Audit first (OLD)

Run:

```bash
psql "$OLD_DB_URL" -Atc "select count(*) as auth_users from auth.users;"
psql "$OLD_DB_URL" -Atc "select count(*) as profiles, count(email) as profiles_with_email from public.profiles;" 2>/dev/null
psql "$OLD_DB_URL" -Atc "select table_schema, table_name, column_name from information_schema.columns where table_schema not like 'pg_%' and column_name ilike '%user%id%' order by 1,2,3;"
```

### Export OLD auth id↔email mapping

```bash
psql "$OLD_DB_URL" -c "\copy (select id, email from auth.users order by email) to 'old_auth_users.csv' csv header"
```

### Recreate users in NEW + trigger password resets

Use:
- [scripts/auth_export_users.mjs](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/auth_export_users.mjs)
- [scripts/auth_import_users.mjs](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/auth_import_users.mjs)
- [scripts/auth_send_resets.mjs](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/auth_send_resets.mjs)

Then remap user ids in NEW DB using the columns found by the audit (do not guess columns).

Example flow:

```bash
OLD_SUPABASE_URL="https://udsrdgfhqfvrkmqghyyj.supabase.co" \
OLD_SERVICE_ROLE_KEY="$OLD_SERVICE_ROLE_KEY" \
node scripts/auth_export_users.mjs --out old_auth_users.csv

NEW_SUPABASE_URL="https://khydacdmfnwfwytqdoei.supabase.co" \
NEW_SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY" \
node scripts/auth_import_users.mjs --csv old_auth_users.csv

NEW_SUPABASE_URL="https://khydacdmfnwfwytqdoei.supabase.co" \
NEW_ANON_KEY="$NEW_ANON_KEY" \
RESET_REDIRECT_TO="https://watercolor-workshop.vercel.app/update-password" \
node scripts/auth_send_resets.mjs --csv old_auth_users.csv
```

User-id remap helper (run in NEW DB after users exist):

```bash
psql "$NEW_DB_URL" -v ON_ERROR_STOP=1 -f scripts/user_id_remap.sql
```

## Phase 6: Reconnect this repo + deployments

App env vars used here:
- [client.ts](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/src/integrations/supabase/client.ts)
- [supabase.ts](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/src/lib/supabase.ts)

Update (local and Vercel env vars):
- `VITE_SUPABASE_URL=https://khydacdmfnwfwytqdoei.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<NEW_ANON_KEY>`

Auth redirect URLs to configure in NEW (add both prod + local):
- `https://<your-vercel-domain>/accept-invite`
- `https://<your-vercel-domain>/account-setup`
- `https://<your-vercel-domain>/update-password`
- `http://localhost:5173/accept-invite`
- `http://localhost:5173/account-setup`
- `http://localhost:5173/update-password`

npm/Vite local setup:
- Copy [.env.example](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/.env.example) to `.env` and fill in the NEW values.

n8n update:
- Replace any OLD URL host with NEW host for RPC calls
- Replace OLD service role key headers with NEW service role key
  - Header: `apikey: <NEW_SERVICE_ROLE_KEY>`
  - Header: `Authorization: Bearer <NEW_SERVICE_ROLE_KEY>`

## Phase 7: Validation + rollback

Validation:
- Auth: signup/login, password reset flow, redirect URLs
- RPC: create + claim invite, admin enroll, profile creation
- RLS: verify blocked access when logged out; correct access when enrolled
- Storage: object counts per bucket match; public/private access behavior matches
- Edge Functions: `setup-user` deploy + functional test

If claiming an invite fails with `record "invite_record" has no field "course_slug"`, update the Supabase RPC `claim_course_invite` by running:
- [supabase_hotfix_claim_course_invite_course_slug.sql](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/supabase_hotfix_claim_course_invite_course_slug.sql)

Rollback:
- Keep OLD project intact.
- If NEW fails validation, revert Vercel env vars back to OLD and re-enable OLD automations.
