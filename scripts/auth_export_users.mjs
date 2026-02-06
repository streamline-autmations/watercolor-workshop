import fs from "node:fs";
import path from "node:path";

function getArg(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function normalizeUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

async function fetchPage(baseUrl, serviceRoleKey, page, perPage) {
  const url = new URL(`${normalizeUrl(baseUrl)}/auth/v1/admin/users`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));

  const res = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Export failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function run() {
  const oldUrl = process.env.OLD_SUPABASE_URL ?? requireEnv("OLD_SUPABASE_URL");
  const oldServiceRoleKey = process.env.OLD_SERVICE_ROLE_KEY ?? requireEnv("OLD_SERVICE_ROLE_KEY");

  const outFile = getArg("--out", "old_auth_users.csv");
  const perPage = Number(getArg("--per-page", "200"));

  const rows = [];
  let page = 1;

  for (;;) {
    const users = await fetchPage(oldUrl, oldServiceRoleKey, page, perPage);
    if (!Array.isArray(users) || users.length === 0) break;

    for (const u of users) {
      rows.push({ id: u.id, email: u.email ?? "" });
    }

    page += 1;
  }

  const absOut = path.resolve(outFile);
  const header = ["id", "email"].map(csvEscape).join(",") + "\n";
  const body = rows.map((r) => [r.id, r.email].map(csvEscape).join(",")).join("\n") + (rows.length ? "\n" : "");
  fs.writeFileSync(absOut, header + body, "utf8");

  console.log(`Wrote ${rows.length} users to ${absOut}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

