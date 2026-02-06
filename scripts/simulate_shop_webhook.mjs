import fs from "node:fs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function normalizeUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function readJsonFile(path) {
  const raw = fs.readFileSync(path, "utf8");
  return JSON.parse(raw);
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

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL ?? requireEnv("SUPABASE_URL");
  const serviceRoleKey = process.env.SERVICE_ROLE_KEY ?? requireEnv("SERVICE_ROLE_KEY");

  const payloadPath = getArg("--payload") ?? requireEnv("PAYLOAD_JSON");
  const mapPath = getArg("--map") ?? requireEnv("SKU_MAP_JSON");
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:5173";

  const payload = readJsonFile(payloadPath);
  const skuMap = readJsonFile(mapPath);

  const email = payload?.email ?? payload?.customer?.email;
  if (!email) throw new Error("Missing email in payload (expected payload.email or payload.customer.email).");

  const lineItems = payload?.line_items ?? payload?.items ?? [];
  if (!Array.isArray(lineItems) || lineItems.length === 0) throw new Error("Missing line items in payload (expected payload.line_items).");

  const skus = lineItems
    .map((i) => i?.sku)
    .filter((s) => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim());

  if (skus.length === 0) throw new Error("No SKUs found in payload line items.");

  const courseSlugs = new Set();
  const unknownSkus = [];
  for (const sku of skus) {
    const courseSlug = skuMap[sku];
    if (!courseSlug) unknownSkus.push(sku);
    else courseSlugs.add(courseSlug);
  }

  if (unknownSkus.length > 0) {
    console.error("Unknown SKU(s) — refusing to create invites:");
    for (const s of unknownSkus) console.error(`- ${s}`);
    process.exit(2);
  }

  console.log("Creating invites for:");
  console.log(`- email: ${email}`);
  console.log(`- course slugs: ${Array.from(courseSlugs).join(", ")}`);

  for (const courseSlug of courseSlugs) {
    // 1. Lookup UUID
    const lookupUrl = `${normalizeUrl(supabaseUrl)}/rest/v1/courses?slug=eq.${courseSlug}&select=id`;
    const lookupRes = await fetch(lookupUrl, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!lookupRes.ok) {
        console.error(`Failed to lookup course slug: ${courseSlug}`);
        process.exit(1);
    }
    
    const lookupJson = await lookupRes.json();
    const courseId = lookupJson?.[0]?.id;

    if (!courseId) {
        console.error(`Course not found for slug: ${courseSlug}`);
        process.exit(1);
    }

    const r = await callRpc(supabaseUrl, serviceRoleKey, "create_course_invite", {
      p_course_id: courseId,
      p_email: email,
      p_expires_in_days: 30,
    });

    if (!r.ok) {
      console.error(`create_course_invite failed for ${courseSlug} (${r.status})`);
      console.error(r.text);
      process.exit(1);
    }

    const token = r.json?.token ?? null;
    if (!token) {
      console.error(`No token returned for ${courseSlug}`);
      console.error(r.text);
      process.exit(1);
    }

    console.log(`Invite link (${courseSlug}): ${normalizeUrl(appBaseUrl)}/accept-invite?invite=${token}`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

