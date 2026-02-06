param(
  [Parameter(Mandatory=$true)][string]$ProjectRef,
  [Parameter(Mandatory=$true)][string]$ServiceRoleKey
)

$supabaseUrl = "https://$ProjectRef.supabase.co"

supabase functions deploy setup-user --project-ref $ProjectRef

supabase secrets set --project-ref $ProjectRef `
  SB_URL="$supabaseUrl" `
  SB_SERVICE_ROLE_KEY="$ServiceRoleKey"
