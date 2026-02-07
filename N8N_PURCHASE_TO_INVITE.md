# Purchase → Invite Flow (n8n)

## Goal
When someone buys a course, n8n should create an invite for the correct course and email the invite link to the buyer. The buyer only gets access to the course tied to that invite.

## Data Model (Supabase)
- `course_invites`: stores the invite token and which course it grants
- `enrollments`: stores which users have access to which courses
- `create_course_invite(p_course_id, p_email, p_expires_in_days)`: creates a course-specific invite token
- `claim_course_invite(p_token)`: redeems the token and creates an enrollment

## Important Identifiers
Use the course **slug** for mapping and routing:
- Example slugs: `holiday-watercolor-workshop`, `blom-flower-watercolor-workshop`

When calling Supabase, **prefer passing the `courses.id` UUID** into `create_course_invite` (most reliable across DB versions). If your `create_course_invite` function supports slugs directly, you can pass the slug, but UUID is safer.

## Recommended Mapping
Create a mapping from your shop’s product identifier to a course slug:
- `product_sku` → `course_slug`

Example mapping file: [course_sku_map.example.json](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/course_sku_map.example.json)

## Webhook Payload (Shop → n8n)
Minimum payload n8n needs:
```json
{
  "order_id": "ORDER-123",
  "email": "buyer@example.com",
  "line_items": [{ "sku": "SKU_XMAS_WATERCOLOR", "quantity": 1 }]
}
```

## n8n Workflow Outline
1) **Webhook Trigger** (payment success)
- Receives payload

2) **Validate + Extract**
- Ensure `email` exists
- Ensure there is at least one `line_items[].sku`

3) **Map SKU → course slug**
- If SKU is unknown: stop workflow and notify you (don’t guess).

4) **Supabase RPC: create_course_invite**
- HTTP POST to:
  - `https://<NEW_PROJECT_REF>.supabase.co/rest/v1/rpc/create_course_invite`
- Headers:
  - `apikey: <NEW_SERVICE_ROLE_KEY>`
  - `Authorization: Bearer <NEW_SERVICE_ROLE_KEY>`
  - `Content-Type: application/json`
- Body:
```json
{
  "p_course_id": "holiday-watercolor-workshop",
  "p_email": "buyer@example.com",
  "p_expires_in_days": 30
}
```

5) **Send Email**
- Use the returned `token` to build the link:
  - `https://YOUR_DOMAIN/accept-invite?invite=<token>`

6) **Course lookup (slug → UUID)**
- If your shop mapping uses slugs (recommended), add a lookup step:
  - GET `https://<NEW_PROJECT_REF>.supabase.co/rest/v1/courses?select=id&slug=eq.<slug>`
  - Then pass the returned `id` into `create_course_invite` as `p_course_id`.

7) **Optional: Notify Admin**
- Post a Slack/WhatsApp/email to yourself with `order_id`, `email`, `course_slug`

## Practical n8n node setup (recommended)
- Webhook Trigger → receive `{ order_id, email, line_items[] }`
- Code/Function → extract SKUs, map to distinct `course_slug[]`, fail fast on unknown SKUs
- Split In Batches (or loop) → for each course slug:
  - HTTP Request (GET courses) → fetch `id` by `slug`
  - HTTP Request (POST RPC create_course_invite) → create invite token
- Email node → send one email (either per course, or compile multiple invite links into one email)

## Idempotency (avoid double-sending invites)
Payment webhooks can retry. Add a guard so one order only generates invites once:
- Use n8n’s built-in data store (key = `order_id`) and exit early if already processed, or
- Store `order_id` in your database (recommended long-term) and check before creating new invites.

## How the student actually gets access
- n8n **does not** grant access by itself.
- The invite link takes the student to `/accept-invite`.
- After the student logs in (or signs up), the app calls `claim_course_invite(token)`.
- `claim_course_invite` creates the `enrollments` row, and **that** is what removes the lock screen.

## Optional: “Instant access” (auto-enroll existing users)
If you want “paid → already unlocked without clicking an invite”, you need extra automation:
- Look up the Supabase user id by email (Admin API / service role).
- Call a server-side enrollment function (for example `enroll_user_by_id`) to insert into `enrollments`.

This is intentionally not the default, because it requires elevated permissions and careful handling of mismatched emails (purchase email must match the login email).

## Testing Without Real Payments
Use the local scripts to simulate a purchase webhook:
- Payload example: [shop_payload.example.json](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/shop_payload.example.json)
- Runner: [simulate_shop_webhook.mjs](file:///c:/Users/User/Desktop/Blom%20Cosmetics/BLom-Academy-trae/watercolor-workshop/scripts/simulate_shop_webhook.mjs)

PowerShell example (set real values locally, do not commit):
```powershell
$env:SUPABASE_URL="https://khydacdmfnwfwytqdoei.supabase.co"
$env:SERVICE_ROLE_KEY="<NEW_SERVICE_ROLE_KEY>"
$env:PAYLOAD_JSON=".\scripts\shop_payload.example.json"
$env:SKU_MAP_JSON=".\scripts\course_sku_map.example.json"
$env:APP_BASE_URL="http://localhost:5173"
node .\scripts\simulate_shop_webhook.mjs
```
