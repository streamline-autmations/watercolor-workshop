
import fs from "node:fs";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function normalizeUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL ?? requireEnv("SUPABASE_URL");
  const serviceRoleKey = process.env.SERVICE_ROLE_KEY ?? requireEnv("SERVICE_ROLE_KEY");

  const url = `${normalizeUrl(supabaseUrl)}/rest/v1/courses?select=id,slug,title`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!res.ok) {
    console.error("Failed to fetch courses:", res.status, res.statusText);
    const text = await res.text();
    console.error(text);
    process.exit(1);
  }

  const courses = await res.json();
  console.log("Found courses:");
  console.table(courses);
}

run().catch(console.error);
