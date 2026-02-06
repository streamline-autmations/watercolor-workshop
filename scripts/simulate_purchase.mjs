function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function normalizeUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function callRpc(baseUrl, serviceRoleKey, fn, body) {
  const url = `${normalizeUrl(baseUrl)}/rest/v1/rpc/${fn}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: res.status, ok: res.ok, text, json };
}

async function run() {
  const url = process.env.SUPABASE_URL ?? requireEnv("SUPABASE_URL");
  const key = process.env.SERVICE_ROLE_KEY ?? requireEnv("SERVICE_ROLE_KEY");
  const course = process.env.COURSE_SLUG ?? requireEnv("COURSE_SLUG");
  const email = process.env.BUYER_EMAIL ?? requireEnv("BUYER_EMAIL");
  const expiresInDays = Number(process.env.EXPIRES_IN_DAYS ?? "30");
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:5173";

  const r = await callRpc(url, key, "create_course_invite", {
    p_course_id: course,
    p_email: email,
    p_expires_in_days: expiresInDays,
  });

  if (!r.ok) {
    console.error(`create_course_invite failed (${r.status})`);
    console.error(r.text);
    process.exit(1);
  }

  const token = r.json?.token ?? null;
  if (!token) {
    console.error("No token returned from create_course_invite.");
    console.error(r.text);
    process.exit(1);
  }

  console.log("Invite created:");
  console.log(`- course: ${course}`);
  console.log(`- email: ${email}`);
  console.log(`- link: ${normalizeUrl(appBaseUrl)}/accept-invite?invite=${token}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

