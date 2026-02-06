param(
  [Parameter(Mandatory=$true)][string]$OldSupabaseUrl,
  [Parameter(Mandatory=$true)][string]$NewSupabaseUrl,
  [Parameter(Mandatory=$true)][string]$OldServiceRoleKey,
  [Parameter(Mandatory=$true)][string]$NewServiceRoleKey,
  [Parameter(Mandatory=$false)][switch]$DryRun,
  [Parameter(Mandatory=$false)][int]$Concurrency = 4,
  [Parameter(Mandatory=$false)][string]$Bucket,
  [Parameter(Mandatory=$false)][switch]$NoUpsert
)

$env:OLD_SUPABASE_URL = $OldSupabaseUrl
$env:NEW_SUPABASE_URL = $NewSupabaseUrl
$env:OLD_SERVICE_ROLE_KEY = $OldServiceRoleKey
$env:NEW_SERVICE_ROLE_KEY = $NewServiceRoleKey

$args = @()
if ($Bucket) { $args += @("--bucket", $Bucket) }
if ($DryRun) { $args += "--dry-run" }
if ($NoUpsert) { $args += "--no-upsert" }
if ($Concurrency -gt 0) { $args += @("--concurrency", $Concurrency.ToString()) }

node (Join-Path $PSScriptRoot "storage_migrate.mjs") @args

