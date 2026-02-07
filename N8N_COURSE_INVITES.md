# n8n → BLOM Academy Course Invites (Supabase)

This frontend app expects course access to be granted via Supabase `enrollments`, and it expects purchase emails to send an invite link that looks like:

`https://YOUR_DOMAIN/accept-invite?invite=TOKEN`

After the student signs up (or logs in), the app redeems the token via `claim_course_invite`, which should create the enrollment.

## 1) Course identifiers (what n8n must pass)

The website routes use course slugs. Current slugs in the frontend content are:

- `online-watercolour-workshop`
- `holiday-watercolor-workshop`
- `blom-flower-watercolor-workshop`

Your Supabase RPC `create_course_invite` takes a `p_course_id` argument. In some setups this is a UUID, in others it’s a text identifier (slug). Use whichever your database function expects.

If you’re not sure which it is, test manually in Supabase SQL editor or via a request and see if it errors on type mismatch.

## 2) Recommended n8n flow shape

**Trigger**
- Your payment platform webhook (Shopify / WooCommerce / PayFast / Stripe / etc.)

**Steps**
1. Extract buyer email and the purchased product/course identifier.
2. Map product → course (slug or id).
3. Call Supabase RPC `create_course_invite`.
4. Email the buyer the invite link.

## 3) Supabase RPC call (HTTP request)

Use a Supabase key that can call the function (typically a Service Role key inside n8n, never in the browser).

**Request**
- Method: `POST`
- URL:
  - `https://YOUR_PROJECT_REF.supabase.co/rest/v1/rpc/create_course_invite`
- Headers:
  - `apikey: YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`
  - `content-type: application/json`
- Body:

```json
{
  "p_course_id": "holiday-watercolor-workshop",
  "p_email": "student@example.com",
  "p_expires_in_days": 30
}
```

**Response**
- Your function should return something that includes the invite `token`.

## 4) Invite email link

Build the link with the returned token:

`https://YOUR_DOMAIN/accept-invite?invite={{token}}`

Notes:
- Old links like `/invite/:token` still work, but they immediately redirect to `/accept-invite`.
- The app redeems the invite only after the student is authenticated.

## 5) “Existing user” vs “new user”

You can keep the email exactly the same for both cases:
- If the buyer already has an account, they log in and the invite is claimed automatically.
- If they don’t have an account, they sign up and the invite is claimed right after signup.

## 6) Important auth setting to verify in Supabase

If Supabase email confirmation is enabled for signups, a brand new user may not get an active session immediately after `signUp()`. In that case, the user must confirm their email before they can log in and redeem the invite.

If you want “buy → immediately access”, consider one of:
- disable email confirmation for this project, or
- use magic-link/OTP based auth for purchasers, or
- create the user server-side and send an auth invite, then redeem the course invite after login.

## 7) Security note

Course content (lesson metadata and some video URLs) is bundled in the frontend. The app blocks navigation by enrollment, but true content security depends on your video/file hosting enforcing its own access controls.
