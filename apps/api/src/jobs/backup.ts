/**
 * Nightly encrypted backup job — BIR EOPT 10-year retention compliance.
 *
 * Steps:
 *   1. pg_dump --no-owner --no-acl > /tmp/dump.sql
 *   2. encrypt with AES-256-GCM using BACKUP_ENC_KEY (32 bytes hex)
 *   3. upload to Cloudflare R2 (S3 API) with object-lock retention 10 years
 *   4. record SHA-256 + size + timestamp into Postgres backup_log table
 *   5. prune local /tmp file
 *
 * Schedule: invoked by a cron (Render scheduled job, or any external scheduler)
 * with `node dist/jobs/backup.js`. Not run from inside the HTTP server process.
 *
 * Required env:
 *   DATABASE_URL              — same as the API
 *   BACKUP_ENC_KEY            — 64 hex chars (32 bytes) AES-256 key
 *   R2_ENDPOINT               — https://<account>.r2.cloudflarestorage.com
 *   R2_BUCKET                 — versioned, object-locked bucket name
 *   R2_ACCESS_KEY_ID          — R2 access key
 *   R2_SECRET_ACCESS_KEY      — R2 secret
 *
 * Object-lock and 10-year retention should be configured at the bucket level
 * (R2 Object Lock Compliance Mode). The job sets `x-amz-object-lock-mode` and
 * `x-amz-object-lock-retain-until-date` headers on each upload to be safe.
 *
 * If you don't have R2 wired yet, set BACKUP_LOCAL_DIR and the job writes
 * encrypted dumps there instead — useful for the dev sandbox.
 */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db, backupLog } from "@aunt-sallys/db";
// @aws-sdk/client-s3 is dynamically imported inside uploadToR2 so this file
// typechecks even when the SDK isn't installed in the dev sandbox. In
// production the dependency MUST be installed (see apps/api/package.json).

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;

interface Config {
  databaseUrl: string;
  encKeyHex: string;
  r2: {
    endpoint?: string;
    bucket?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
  localDir?: string;
}

function loadConfig(): Config {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required for backup");
  const encKeyHex = process.env.BACKUP_ENC_KEY;
  if (!encKeyHex || encKeyHex.length !== 64) {
    throw new Error("BACKUP_ENC_KEY must be 64 hex chars (32 bytes for AES-256-GCM)");
  }
  return {
    databaseUrl,
    encKeyHex,
    r2: {
      endpoint: process.env.R2_ENDPOINT,
      bucket: process.env.R2_BUCKET,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    localDir: process.env.BACKUP_LOCAL_DIR,
  };
}

function pgDump(databaseUrl: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("pg_dump", [
      "--no-owner", "--no-acl", "--format=custom", "--file", outPath, databaseUrl,
    ], { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pg_dump exited with code ${code}`));
    });
  });
}

/**
 * Encrypt with AES-256-GCM. Output file layout:
 *   [12-byte IV] [ciphertext...] [16-byte auth tag]
 * The same layout is required for decryption.
 */
function encryptFileAesGcm(
  srcPath: string,
  dstPath: string,
  keyHex: string
): Promise<{ sha256: string; size: number }> {
  return new Promise((resolve, reject) => {
    const key = Buffer.from(keyHex, "hex");
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const sha = crypto.createHash("sha256");

    const input = fs.createReadStream(srcPath);
    const tmp = `${dstPath}.part`;
    const output = fs.createWriteStream(tmp);

    output.write(iv);
    input.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      sha.update(buf);
      output.write(cipher.update(buf));
    });
    input.on("error", reject);
    input.on("end", () => {
      output.write(cipher.final());
      output.write(cipher.getAuthTag());
      output.end(() => {
        try {
          fs.renameSync(tmp, dstPath);
          resolve({ sha256: sha.digest("hex"), size: fs.statSync(dstPath).size });
        } catch (e) { reject(e); }
      });
    });
  });
}

async function uploadToR2(cfg: Config, key: string, srcPath: string): Promise<void> {
  if (!cfg.r2.endpoint || !cfg.r2.bucket || !cfg.r2.accessKeyId || !cfg.r2.secretAccessKey) {
    throw new Error("R2 config incomplete");
  }
  // Dynamic import so the SDK is only loaded when uploadToR2 actually runs;
  // keeps the rest of the API independent of @aws-sdk/client-s3 install state.
  // ts-ignore until `pnpm install` is run in the deployment environment.
  // @ts-ignore — package is in apps/api/package.json deps; resolved at install time.
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    endpoint: cfg.r2.endpoint,
    region: "auto",
    credentials: {
      accessKeyId: cfg.r2.accessKeyId,
      secretAccessKey: cfg.r2.secretAccessKey,
    },
  });
  const body = fs.readFileSync(srcPath);
  const retainUntil = new Date(Date.now() + TEN_YEARS_MS);
  await s3.send(new PutObjectCommand({
    Bucket: cfg.r2.bucket,
    Key: key,
    Body: body,
    ContentType: "application/octet-stream",
    // Object-lock metadata — bucket must have Object Lock enabled for these
    // headers to be honored. R2 supports Object Lock in Compliance mode.
    ObjectLockMode: "COMPLIANCE",
    ObjectLockRetainUntilDate: retainUntil,
  }));
}

export async function runBackup(): Promise<{ key: string; sha256: string; size: number }> {
  const cfg = loadConfig();
  const startedAt = new Date();
  const ts = startedAt.toISOString().replace(/[:.]/g, "-");
  const tmpDump = `/tmp/aunt-sallys-${ts}.dump`;
  const tmpEnc = `${tmpDump}.aes`;

  console.log(`[backup] starting at ${ts}`);
  try {
    await pgDump(cfg.databaseUrl, tmpDump);

    const { sha256, size } = await encryptFileAesGcm(tmpDump, tmpEnc, cfg.encKeyHex);

    const yyyymm = ts.slice(0, 7);
    const key = `daily/${yyyymm}/aunt-sallys-${ts}.dump.aes`;

    if (cfg.localDir) {
      const dst = path.join(cfg.localDir, key);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(tmpEnc, dst);
      console.log(`[backup] local copy → ${dst}`);
    } else {
      await uploadToR2(cfg, key, tmpEnc);
      console.log(`[backup] uploaded → r2://${cfg.r2.bucket}/${key}`);
    }

    console.log(`[backup] sha256=${sha256} size=${size}`);

    // Clean tmp files
    try { fs.unlinkSync(tmpDump); } catch {}
    try { fs.unlinkSync(tmpEnc); } catch {}

    // BIR retention evidence — record the successful run (append-only log).
    await recordBackup({ objectKey: key, sha256, sizeBytes: size, status: "success", error: null, startedAt });

    return { key, sha256, size };
  } catch (err) {
    // A failed backup must be visible, not silent — record it and re-throw.
    try { fs.unlinkSync(tmpDump); } catch {}
    try { fs.unlinkSync(tmpEnc); } catch {}
    await recordBackup({
      objectKey: null,
      sha256: null,
      sizeBytes: null,
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
      startedAt,
    });
    throw err;
  }
}

/** Append one row to backup_log. Never throws — logging must not mask the run's real outcome. */
async function recordBackup(row: {
  objectKey: string | null;
  sha256: string | null;
  sizeBytes: number | null;
  status: "success" | "failed";
  error: string | null;
  startedAt: Date;
}): Promise<void> {
  try {
    await db.insert(backupLog).values(row);
  } catch (e) {
    console.error("[backup] WARNING — could not write backup_log row:", e);
  }
}

// Entrypoint when run directly: `node dist/jobs/backup.js`
const isDirect =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].endsWith("backup.js");
if (isDirect) {
  runBackup()
    .then((r) => { console.log("[backup] done", r); process.exit(0); })
    .catch((e) => { console.error("[backup] FAILED", e); process.exit(1); });
}
