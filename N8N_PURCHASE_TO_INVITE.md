# Purchase → Invite Flow (n8n)

## Goal
When someone buys a course, n8n should create an invite for the correct course and email the invite link to the buyer. The buyer only gets access to the course tied to that invite.

## Data Model (Supabase)
- `course_invites`: stores the invite token and which course it grants
- `enrollments`: stores which users have access to which courses
- `create_course_invite(p_course_id, p_email, p_expires_in_days)`: creates a course-specific invite token
- `claim_course_invite(p_token)`: redeems the token and creates an enrollment

## Important Identifiers
Use the course **slug** everywhere in automation:
- Example slugs: `christmas-watercolor-workshop`, `blom-flower-workshop`

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
  "p_course_id": "christmas-watercolor-workshop",
  "p_email": "buyer@example.com",
  "p_expires_in_days": 30
}
```

5) **Send Email**
- Use the returned `token` to build the link:
  - `https://YOUR_DOMAIN/accept-invite?invite=<token>`

6) **Optional: Notify Admin**
- Post a Slack/WhatsApp/email to yourself with `order_id`, `email`, `course_slug`

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

