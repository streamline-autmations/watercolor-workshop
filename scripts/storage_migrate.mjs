import { createClient } from "@supabase/supabase-js";

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function normalizeUrl(url) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function looksLikeJwt(token) {
  const t = String(token ?? "").trim();
  const parts = t.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function buildClients() {
  const oldUrl = normalizeUrl(process.env.OLD_SUPABASE_URL ?? requireEnv("OLD_SUPABASE_URL"));
  const newUrl = normalizeUrl(process.env.NEW_SUPABASE_URL ?? requireEnv("NEW_SUPABASE_URL"));
  const oldKey = process.env.OLD_SERVICE_ROLE_KEY ?? requireEnv("OLD_SERVICE_ROLE_KEY");
  const newKey = process.env.NEW_SERVICE_ROLE_KEY ?? requireEnv("NEW_SERVICE_ROLE_KEY");

  if (!looksLikeJwt(oldKey)) throw new Error("OLD_SERVICE_ROLE_KEY does not look like a JWT (expected 3 dot-separated parts).");
  if (!looksLikeJwt(newKey)) throw new Error("NEW_SERVICE_ROLE_KEY does not look like a JWT (expected 3 dot-separated parts).");

  const oldClient = createClient(oldUrl, oldKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const newClient = createClient(newUrl, newKey, { auth: { persistSession: false, autoRefreshToken: false } });

  return { oldUrl, newUrl, oldClient, newClient };
}

async function listAllObjects(storage, bucket, prefix) {
  const limit = 1000;
  let offset = 0;
  const files = [];

  for (;;) {
    const { data, error } = await storage.from(bucket).list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;

    for (const entry of data ?? []) {
      const isFolder = entry?.id == null;
      if (isFolder) {
        const childPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
        const nested = await listAllObjects(storage, bucket, childPrefix);
        files.push(...nested);
      } else {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        files.push({ path, metadata: entry.metadata ?? null });
      }
    }

    if (!data || data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function ensureBucket(newClient, bucket) {
  const { data: buckets, error } = await newClient.storage.listBuckets();
  if (error) throw error;

  const existing = (buckets ?? []).find((b) => b.name === bucket.name);
  if (existing) return;

  const { error: createError } = await newClient.storage.createBucket(bucket.name, {
    public: bucket.public,
    fileSizeLimit: bucket.file_size_limit ?? undefined,
    allowedMimeTypes: bucket.allowed_mime_types ?? undefined,
  });
  if (createError) throw createError;
}

async function uploadObject(newClient, bucketName, path, bytes, contentType, upsert) {
  const { error } = await newClient.storage.from(bucketName).upload(path, bytes, { upsert, contentType });
  if (error) throw error;
}

async function downloadObject(oldClient, bucketName, path) {
  const { data, error } = await oldClient.storage.from(bucketName).download(path);
  if (error) throw error;
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function run() {
  const onlyBucket = getArg("--bucket");
  const dryRun = hasFlag("--dry-run");
  const upsert = !hasFlag("--no-upsert");
  const concurrency = Number(getArg("--concurrency") ?? "4");

  const { oldClient, newClient } = buildClients();

  const { data: oldBuckets, error: oldBucketsError } = await oldClient.storage.listBuckets();
  if (oldBucketsError) throw oldBucketsError;

  const buckets = (oldBuckets ?? [])
    .filter((b) => (onlyBucket ? b.name === onlyBucket : true))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (buckets.length === 0) {
    console.log("No buckets found to migrate.");
    return;
  }

  for (const bucket of buckets) {
    await ensureBucket(newClient, bucket);
    const files = await listAllObjects(oldClient.storage, bucket.name, "");

    console.log(`Bucket: ${bucket.name} (${files.length} objects)`);
    if (dryRun) continue;

    let index = 0;
    const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
      for (;;) {
        const current = index++;
        if (current >= files.length) return;
        const { path, metadata } = files[current];
        const bytes = await downloadObject(oldClient, bucket.name, path);
        const contentType = metadata?.mimetype ?? undefined;
        await uploadObject(newClient, bucket.name, path, bytes, contentType, upsert);
      }
    });

    await Promise.all(workers);
  }

  console.log("Storage migration complete.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
