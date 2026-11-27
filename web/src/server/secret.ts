import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Encryption at rest for mail credentials (MAIL-05): AES-256-GCM. The key comes
 * from MAIL_SECRET_KEY (32 bytes, base64 or hex), or a random key the app writes
 * once to .secrets/mail.key (git-ignored). Credentials are never logged.
 */

let cached: Buffer | null = null;

function key(): Buffer {
  if (cached) return cached;
  const env = process.env.MAIL_SECRET_KEY?.trim();
  if (env) {
    const k = /^[0-9a-f]{64}$/i.test(env) ? Buffer.from(env, "hex") : Buffer.from(env, "base64");
    if (k.length !== 32) throw new Error("MAIL_SECRET_KEY must be 32 bytes (64 hex characters or 44 base64 characters).");
    return (cached = k);
  }
  const dir = join(process.cwd(), ".secrets");
  const file = join(dir, "mail.key");
  if (!existsSync(file)) {
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, randomBytes(32).toString("base64"), { mode: 0o600 });
    try { chmodSync(file, 0o600); } catch { /* Windows: ACLs apply instead */ }
  }
  const k = Buffer.from(readFileSync(file, "utf8").trim(), "base64");
  if (k.length !== 32) throw new Error(".secrets/mail.key is damaged. Delete it and connect Gmail again.");
  return (cached = k);
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

export function decrypt(box: string): string {
  const [v, iv, tag, ct] = box.split(":");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unknown credential format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}
