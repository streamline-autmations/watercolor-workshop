param(
  [Parameter(Mandatory=$true)][string]$OldDbUrl,
  [Parameter(Mandatory=$true)][string]$NewDbUrl,
  [Parameter(Mandatory=$false)][string]$OutDir = ".\migration_artifacts"
)

$oldLooksLikeUrl = $OldDbUrl -match '^postgres(ql)?://'
$newLooksLikeUrl = $NewDbUrl -match '^postgres(ql)?://'
if (-not $oldLooksLikeUrl -or -not $newLooksLikeUrl) {
  throw "OldDbUrl/NewDbUrl must be full Postgres connection strings (postgresql://...), not project refs."
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$dumpPath = Join-Path $OutDir "old_app.sql"

pg_dump $OldDbUrl `
  --no-owner --no-acl `
  --schema=public `
  --format=plain `
  --file $dumpPath

psql $NewDbUrl -v ON_ERROR_STOP=1 -1 -f $dumpPath

psql $OldDbUrl -Atc "select schemaname, tablename, policyname, cmd from pg_policies order by 1,2,3;" | Out-File -Encoding utf8 (Join-Path $OutDir "old_policies.txt")
psql $NewDbUrl -Atc "select schemaname, tablename, policyname, cmd from pg_policies order by 1,2,3;" | Out-File -Encoding utf8 (Join-Path $OutDir "new_policies.txt")

psql $OldDbUrl -Atc "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' order by 1,2;" | Out-File -Encoding utf8 (Join-Path $OutDir "old_functions.txt")
psql $NewDbUrl -Atc "select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname not like 'pg_%' and n.nspname <> 'information_schema' order by 1,2;" | Out-File -Encoding utf8 (Join-Path $OutDir "new_functions.txt")

psql $OldDbUrl -Atc "select schemaname, relname, n_live_tup from pg_stat_user_tables order by schemaname, relname;" | Out-File -Encoding utf8 (Join-Path $OutDir "old_row_estimates.txt")
psql $NewDbUrl -Atc "select schemaname, relname, n_live_tup from pg_stat_user_tables order by schemaname, relname;" | Out-File -Encoding utf8 (Join-Path $OutDir "new_row_estimates.txt")
