import fs from "node:fs";
import path from "node:path";
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

function parseEmailsFromCsv(fileText) {
  const lines = fileText.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((s) => s.trim().toLowerCase());
  const emailIndex = header.indexOf("email");
  if (emailIndex === -1) throw new Error("CSV must include header: email");

  return lines
    .slice(1)
    .map((line) => splitCsvLine(line)[emailIndex])
    .map((s) => String(s ?? "").trim())
    .filter(Boolean);
}

async function run() {
  const newUrl = normalizeUrl(process.env.NEW_SUPABASE_URL ?? requireEnv("NEW_SUPABASE_URL"));
  const newAnonKey = process.env.NEW_ANON_KEY ?? requireEnv("NEW_ANON_KEY");

  const csvPath = getArg("--csv", "old_auth_users.csv");
  const redirectTo = process.env.RESET_REDIRECT_TO ?? getArg("--redirect-to", "");

  const absCsv = path.resolve(csvPath);
  const csvText = fs.readFileSync(absCsv, "utf8");
  const emails = parseEmailsFromCsv(csvText);

  const supabase = createClient(newUrl, newAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

  let sent = 0;
  for (const email of emails) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) throw error;
    sent += 1;
  }

  console.log(`Requested password resets for ${sent} users.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

