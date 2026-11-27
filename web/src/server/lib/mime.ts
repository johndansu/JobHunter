import { createHash, randomBytes } from "node:crypto";

/**
 * One RFC 5322 MIME message per send (MAIL-07). It is built once, shown in the
 * preview, hashed at approval, and the same bytes go to the transport. Plain
 * text only: no HTML, no tracking pixels, no remote content (P-17).
 */

export type Attachment = { filename: string; contentType: string; bytes: Uint8Array };
export type MailInput = {
  from: { name: string | null; email: string };
  to: string[];
  subject: string;
  text: string;
  date: Date;
  messageId: string; // without angle brackets
  inReplyTo?: string | null;
  references?: string[];
  attachments?: Attachment[];
};

const CRLF = "\r\n";
const isAscii = (s: string) => /^[\x20-\x7e]*$/.test(s);

/** RFC 2047 encoded-words for non-ASCII header text, each under 75 characters. */
export function encodeHeaderText(s: string): string {
  if (isAscii(s)) return s;
  const words: string[] = [];
  let chunk = "";
  for (const ch of s) {
    const next = chunk + ch;
    if (Buffer.byteLength(next, "utf8") > 45) { words.push(chunk); chunk = ch; } else chunk = next;
  }
  if (chunk) words.push(chunk);
  return words.map((w) => `=?UTF-8?B?${Buffer.from(w, "utf8").toString("base64")}?=`).join(`${CRLF} `);
}

function address(name: string | null, email: string): string {
  if (!name) return email;
  const n = isAscii(name) ? `"${name.replace(/["\\]/g, "\\$&")}"` : encodeHeaderText(name);
  return `${n} <${email}>`;
}

/** RFC 5322 date in UTC, e.g. "Wed, 26 Nov 2026 09:15:00 +0000". */
export function rfc5322Date(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const p = (n: number) => String(n).padStart(2, "0");
  return `${days[d.getUTCDay()]}, ${p(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} +0000`;
}

/** Quoted-printable (RFC 2045) for UTF-8 text, CRLF line breaks, soft breaks at 76. */
export function quotedPrintable(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  return lines.map((line) => {
    let enc = "";
    for (const b of Buffer.from(line, "utf8")) {
      enc += (b >= 33 && b <= 126 && b !== 61) || b === 32 ? String.fromCharCode(b) : `=${b.toString(16).toUpperCase().padStart(2, "0")}`;
    }
    enc = enc.replace(/ $/, "=20"); // trailing space must be encoded
    const out: string[] = [];
    while (enc.length > 76) {
      let cut = 75;
      // Don't split an =XX escape.
      if (enc[cut - 1] === "=") cut -= 1;
      else if (enc[cut - 2] === "=") cut -= 2;
      out.push(enc.slice(0, cut) + "=");
      enc = enc.slice(cut);
    }
    out.push(enc);
    return out.join(CRLF);
  }).join(CRLF);
}

const base64Lines = (b: Uint8Array) => (Buffer.from(b).toString("base64").match(/.{1,76}/g) ?? []).join(CRLF);
const safeName = (s: string) => s.replace(/[^\w.-]+/g, "_");

export function newMessageId(fromEmail: string): string {
  const domain = fromEmail.split("@")[1] || "jobhunter.local";
  return `${randomBytes(12).toString("hex")}.${Date.now().toString(36)}@${domain}`;
}

export function buildMime(m: MailInput): string {
  const headers = [
    `From: ${address(m.from.name, m.from.email)}`,
    `To: ${m.to.join(", ")}`,
    `Subject: ${encodeHeaderText(m.subject)}`,
    `Date: ${rfc5322Date(m.date)}`,
    `Message-ID: <${m.messageId}>`,
    ...(m.inReplyTo ? [`In-Reply-To: <${m.inReplyTo}>`] : []),
    ...(m.references?.length ? [`References: ${m.references.map((r) => `<${r}>`).join(" ")}`] : []),
    "MIME-Version: 1.0",
  ];
  const textPart = ["Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: quoted-printable", "", quotedPrintable(m.text)];
  const atts = m.attachments ?? [];
  if (!atts.length) return [...headers, ...textPart].join(CRLF) + CRLF;
  const boundary = `=_jh_${createHash("sha256").update(m.messageId).digest("hex").slice(0, 24)}`;
  const parts = [
    textPart.join(CRLF),
    ...atts.map((a) => [
      `Content-Type: ${a.contentType}; name="${safeName(a.filename)}"`,
      `Content-Disposition: attachment; filename="${safeName(a.filename)}"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(a.bytes),
    ].join(CRLF)),
  ];
  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    "This is a multi-part message in MIME format.",
    ...parts.map((p) => `--${boundary}${CRLF}${p}`),
    `--${boundary}--`,
    "",
  ].join(CRLF);
}

export const mimeHash = (mime: string) => createHash("sha256").update(mime, "utf8").digest("hex");

/** Headers and attachment list read back from a built message, for the preview. */
export function summarizeMime(mime: string): { headers: [string, string][]; attachments: { filename: string; contentType: string; bytes: number }[]; size: number } {
  const [head] = mime.split(`${CRLF}${CRLF}`);
  const headers = head.replace(/\r\n[ \t]+/g, " ").split(CRLF).map((l) => { const i = l.indexOf(":"); return [l.slice(0, i), l.slice(i + 1).trim()] as [string, string]; });
  const attachments = [...mime.matchAll(/Content-Type: ([^;\r\n]+); name="([^"]+)"\r\nContent-Disposition: attachment[^\r\n]*\r\nContent-Transfer-Encoding: base64\r\n\r\n([A-Za-z0-9+/=\r\n]+)/g)]
    .map((m) => ({ filename: m[2], contentType: m[1], bytes: Buffer.from(m[3].replace(/\r\n/g, ""), "base64").length }));
  return { headers, attachments, size: Buffer.byteLength(mime, "utf8") };
}
