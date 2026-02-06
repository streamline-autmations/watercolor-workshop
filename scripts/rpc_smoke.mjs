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
      Prefer: "tx=rollback",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

async function run() {
  const url = process.env.SUPABASE_URL ?? requireEnv("SUPABASE_URL");
  const key = process.env.SERVICE_ROLE_KEY ?? requireEnv("SERVICE_ROLE_KEY");

  const probes = [
    {
      fn: "create_course_invite",
      body: { p_course_id: "smoke-test", p_email: "smoke-test@example.com", p_expires_in_days: 1 },
    },
    {
      fn: "claim_course_invite",
      body: { p_token: "smoke-test-token" },
    },
    {
      fn: "enroll_user_by_id",
      body: { p_user_id: "00000000-0000-0000-0000-000000000000", p_course_slugs: ["smoke-test"] },
    },
    {
      fn: "create_user_profile_simple",
      body: { p_user_id: "00000000-0000-0000-0000-000000000000", p_first_name: "Smoke", p_last_name: "Test", p_phone: "000" },
    },
  ];

  for (const p of probes) {
    const r = await callRpc(url, key, p.fn, p.body);
    const summary = r.text.length > 500 ? `${r.text.slice(0, 500)}...` : r.text;
    console.log(`${p.fn}: ${r.status}`);
    if (!r.ok) console.log(summary);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

