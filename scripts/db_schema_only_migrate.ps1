param(
  [Parameter(Mandatory=$true)][string]$OldDbUrl,
  [Parameter(Mandatory=$true)][string]$NewDbUrl,
  [Parameter(Mandatory=$false)][string]$OutDir = ".\migration_artifacts",
  [Parameter(Mandatory=$false)][switch]$ResetNewPublic = $true
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$dumpPath = Join-Path $OutDir "old_schema.sql"
$rawDumpPath = Join-Path $OutDir "old_schema_raw.sql"

if ($ResetNewPublic) {
  psql $NewDbUrl -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public;"
  psql $NewDbUrl -v ON_ERROR_STOP=1 -c "grant usage on schema public to anon, authenticated, service_role; grant all on schema public to postgres, service_role; alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated; alter default privileges in schema public grant usage, select on sequences to anon, authenticated; alter default privileges in schema public grant execute on functions to anon, authenticated; alter default privileges in schema public grant all on tables to service_role; alter default privileges in schema public grant all on sequences to service_role; alter default privileges in schema public grant execute on functions to service_role;"
}

pg_dump $OldDbUrl `
  --schema-only `
  --no-publications `
  --no-subscriptions `
  --no-owner --no-acl `
  --exclude-schema=auth `
  --exclude-schema=storage `
  --exclude-schema=realtime `
  --exclude-schema=supabase_functions `
  --exclude-schema=extensions `
  --exclude-schema=graphql `
  --exclude-schema=graphql_public `
  --exclude-schema=pgbouncer `
  --exclude-schema=pgsodium `
  --exclude-schema=net `
  --exclude-schema=vault `
  --exclude-schema=cron `
  --exclude-schema=supabase_migrations `
  --format=plain `
  --file $rawDumpPath

$inEventTriggerStmt = $false
Get-Content $rawDumpPath | ForEach-Object {
  $line = $_

  if ($inEventTriggerStmt) {
    if ($line -match ";\s*$") { $inEventTriggerStmt = $false }
    return
  }

  if ($line -match "^\s*CREATE\s+EVENT\s+TRIGGER\b" -or
      $line -match "^\s*ALTER\s+EVENT\s+TRIGGER\b" -or
      $line -match "^\s*COMMENT\s+ON\s+EVENT\s+TRIGGER\b" -or
      $line -match "^\s*DROP\s+EVENT\s+TRIGGER\b") {
    if ($line -notmatch ";\s*$") { $inEventTriggerStmt = $true }
    return
  }

  if ($line -match "Type:\s+EVENT TRIGGER;" -or $line -match "^\s*--\s+Name:\s+.*;\s+Type:\s+EVENT TRIGGER;") {
    return
  }

  $line
} | Set-Content -Encoding utf8 $dumpPath

psql $NewDbUrl -v ON_ERROR_STOP=1 -1 -f $dumpPath

psql $NewDbUrl -v ON_ERROR_STOP=1 -c "grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role; grant usage, select on all sequences in schema public to anon, authenticated, service_role; grant execute on all functions in schema public to anon, authenticated, service_role;"

psql $OldDbUrl -Atc "select schemaname, tablename, policyname, cmd from pg_policies order by 1,2,3;" | Out-File -Encoding utf8 (Join-Path $OutDir "old_policies.txt")
psql $NewDbUrl -Atc "select schemaname, tablename, policyname, cmd from pg_policies order by 1,2,3;" | Out-File -Encoding utf8 (Join-Path $OutDir "new_policies.txt")

psql $OldDbUrl -Atc "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' order by 1,2;" | Out-File -Encoding utf8 (Join-Path $OutDir "old_functions.txt")
psql $NewDbUrl -Atc "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' order by 1,2;" | Out-File -Encoding utf8 (Join-Path $OutDir "new_functions.txt")

psql $NewDbUrl -Atc "select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('create_course_invite','claim_course_invite','enroll_user_by_id','create_user_profile_simple') order by 1;" | Out-File -Encoding utf8 (Join-Path $OutDir "new_required_rpcs.txt")
