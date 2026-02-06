import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

function parseCsvTwoCols(fileText) {
  const lines = fileText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((s) => s.trim().toLowerCase());
  const idIndex = header.indexOf("id");
  const emailIndex = header.indexOf("email");
  if (idIndex === -1 || emailIndex === -1) throw new Error("CSV must include headers: id,email");

  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line);
    return { old_id: cols[idIndex], email: cols[emailIndex] };
  }).filter((r) => r.email);
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;

  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      out.push(cur);
      cur = "";
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }

  out.push(cur);
  return out;
}

function randomPassword() {
  return crypto.randomBytes(18).toString("base64url");
}

async function run() {
  const newUrl = normalizeUrl(process.env.NEW_SUPABASE_URL ?? requireEnv("NEW_SUPABASE_URL"));
  const newServiceRoleKey = process.env.NEW_SERVICE_ROLE_KEY ?? requireEnv("NEW_SERVICE_ROLE_KEY");

  const csvPath = getArg("--csv", "old_auth_users.csv");
  const confirmEmail = getArg("--confirm-email", "true") === "true";

  const absCsv = path.resolve(csvPath);
  const csvText = fs.readFileSync(absCsv, "utf8");
  const rows = parseCsvTwoCols(csvText);

  const supabase = createClient(newUrl, newServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let created = 0;
  let skipped = 0;

  for (const r of rows) {
    const email = String(r.email).trim();
    if (!email) continue;

    const password = randomPassword();
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: confirmEmail });
    if (error) {
      const isDuplicate = /already\s+registered|user\s+already\s+exists|duplicate/i.test(error.message ?? "");
      if (isDuplicate) {
        skipped += 1;
        continue;
      }
      throw error;
    }

    if (data?.user?.id) created += 1;
  }

  console.log(`Created: ${created}, skipped(existing): ${skipped}, total input: ${rows.length}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

