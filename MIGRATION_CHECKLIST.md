# Migration Checklist (Supabase A → B)

This is the operational checklist to run the migration using the commands/scripts in [SUPABASE_MIGRATION_GUIDE.md](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/SUPABASE_MIGRATION_GUIDE.md).

## Pre-flight

- [ ] Confirm refs: OLD `udsrdgfhqfvrkmqghyyj`, NEW `khydacdmfnwfwytqdoei`
- [ ] Collect: `OLD_DB_URL`, `NEW_DB_URL`
- [ ] Collect: `OLD_SERVICE_ROLE_KEY`, `NEW_SERVICE_ROLE_KEY`, `NEW_ANON_KEY`
- [ ] If any keys/passwords were shared accidentally: rotate Service Role, Anon, and DB password
- [ ] Confirm NEW Auth settings: Site URL + redirect URLs are set for your domains
- [ ] Confirm NEW SMTP is configured (required for password reset emails)
- [ ] Pause automations that write to OLD (n8n, webhooks)

## Phase 1: Audit (record outputs)

- [ ] Run: `psql "$OLD_DB_URL" -v ON_ERROR_STOP=1 -f scripts/supabase_audit.sql` and save output
- [ ] Run: `supabase functions list --project-ref udsrdgfhqfvrkmqghyyj` and save output
- [ ] Run: `supabase secrets list --project-ref udsrdgfhqfvrkmqghyyj` and save output
- [ ] Note OLD: auth providers, SMTP, redirect URLs, email templates, any cron jobs
- [ ] Identify which tables/columns store user ids from the audit output

## Phase 2: DB dump + restore

- [ ] If restarting clean (no production data needed): use schema-only path in `SUPABASE_MIGRATION_GUIDE.md`
- [ ] Schema-only script (recommended for clean restart):
  - [ ] `.\scripts\db_schema_only_migrate.ps1 -OldDbUrl "<old>" -NewDbUrl "<new>"`
- [ ] Run the automated flow:
  - [ ] `.\scripts\db_dump_restore.ps1 -OldDbUrl "<old>" -NewDbUrl "<new>"`
- [ ] Compare `migration_artifacts/old_*` vs `migration_artifacts/new_*` outputs (policies/functions/row estimates)
- [ ] Run NEW RPC presence check for required functions

## Phase 3: Storage (if any buckets exist)

- [ ] Confirm bucket list in OLD via SQL (`storage.buckets`)
- [ ] Dry run:
  - [ ] Run `node scripts/storage_migrate.mjs --dry-run` with env vars set
  - [ ] Or `.\scripts\storage_migrate.ps1 ... -DryRun`
- [ ] Copy:
  - [ ] Run `node scripts/storage_migrate.mjs --concurrency 4` with env vars set
  - [ ] Or `.\scripts\storage_migrate.ps1 ... -Concurrency 4`
- [ ] Verify per-bucket object counts match between OLD and NEW

## Phase 4: Edge Functions

- [ ] Deploy + set secrets to NEW:
  - [ ] `.\scripts\edge_deploy.ps1 -ProjectRef "khydacdmfnwfwytqdoei" -ServiceRoleKey "<new service role>"`
- [ ] Confirm function appears in NEW: `supabase functions list --project-ref khydacdmfnwfwytqdoei`

## Phase 5: Auth users

- [ ] Export users from OLD (choose one):
  - [ ] `psql "$OLD_DB_URL" -c "\copy (select id, email from auth.users order by email) to 'old_auth_users.csv' csv header"`
  - [ ] Or `node scripts/auth_export_users.mjs --out old_auth_users.csv` with OLD env vars
- [ ] Create users in NEW:
  - [ ] `node scripts/auth_import_users.mjs --csv old_auth_users.csv` with NEW env vars
- [ ] Send password reset emails from NEW:
  - [ ] `node scripts/auth_send_resets.mjs --csv old_auth_users.csv` with NEW env vars
- [ ] Remap DB user ids in NEW (only after NEW users exist):
  - [ ] Run `psql "$NEW_DB_URL" -f scripts/user_id_remap.sql`
  - [ ] Execute the generated `update ...` statements that match your schema

## Phase 6: Reconnect app + automation

- [ ] Update Vercel env vars:
  - [ ] `VITE_SUPABASE_URL=https://khydacdmfnwfwytqdoei.supabase.co`
  - [ ] `VITE_SUPABASE_ANON_KEY=<new anon key>`
- [ ] Update local `.env` (use `.env.example` template)
- [ ] Update n8n:
  - [ ] Replace old `...supabase.co` host with NEW
  - [ ] Replace old service role key with NEW

## Phase 7: Validation

- [ ] Run RPC smoke checks (rollback-safe transaction):
  - [ ] `SUPABASE_URL="https://khydacdmfnwfwytqdoei.supabase.co" SERVICE_ROLE_KEY="$NEW_SERVICE_ROLE_KEY" node scripts/rpc_smoke.mjs`
- [ ] Auth:
  - [ ] Existing user can request reset and set a new password
  - [ ] Login works and session persists
- [ ] Core app:
  - [ ] Invite redeem flow works end-to-end
  - [ ] Enrollment-based course access works
  - [ ] Admin access pages still function as expected
- [ ] RLS:
  - [ ] Logged-out cannot access protected routes/data
  - [ ] Logged-in sees only their own enrollments/profile
- [ ] Storage (if used):
  - [ ] Public/private behavior matches OLD
- [ ] Edge Functions:
  - [ ] `setup-user` works for a logged-in bearer token

## Rollback

- [ ] Keep OLD project intact and automations paused until NEW passes validation
- [ ] If NEW fails:
  - [ ] Revert Vercel env vars back to OLD URL + OLD anon key
  - [ ] Re-enable OLD automations
  - [ ] Keep NEW for debugging and retry migration steps
