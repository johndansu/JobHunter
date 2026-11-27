import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import sanitizeHtml from "sanitize-html";

const UA = process.env.USER_AGENT || "JobHunter/2.0";
const MAX_BYTES = 2 * 1024 * 1024;

function privateAddress(ip: string): boolean {
  if (isIP(ip) === 6) return ip === "::1" || /^f[cd]/i.test(ip) || /^fe80/i.test(ip) || /^::ffff:(10|127|169\.254|192\.168)\./.test(ip);
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/**
 * Fetch a company's own careers page the candidate pasted (MAIL-19), to confirm
 * the address is published there. One GET, no personal data in the request,
 * public addresses only, 2 MB cap. Returns visible text plus mailto: addresses.
 */
export async function fetchCompanyPage(raw: string): Promise<{ url: string; host: string; text: string } | { error: string }> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return { error: "That isn't a web address." };
  }
  if (!/^https?:$/.test(url.protocol)) return { error: "Use an http or https address." };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return { error: "That isn't a public website." };
  try {
    const addrs = isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map((a) => a.address);
    if (!addrs.length || addrs.some(privateAddress)) return { error: "That isn't a public website." };
  } catch {
    return { error: `Couldn't find ${host}. Check the address.` };
  }
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html,text/plain" }, redirect: "follow", signal: AbortSignal.timeout(10000) });
  } catch {
    return { error: `Couldn't open ${host}.` };
  }
  if (!res.ok) return { error: `${host} answered ${res.status}.` };
  const finalHost = new URL(res.url || url.toString()).hostname.toLowerCase();
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); break; }
      chunks.push(value);
    }
  }
  const html = new TextDecoder().decode(Buffer.concat(chunks));
  const mailtos = [...html.matchAll(/mailto:([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi)].map((m) => m[1].toLowerCase());
  const text = sanitizeHtml(html.replace(/<\/(p|div|li|h[1-6]|br|tr|section)>/gi, "$&\n"), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
  const extra = [...new Set(mailtos)].filter((e) => !text.toLowerCase().includes(e)).map((e) => `Email link on the page: ${e}.`);
  return { url: res.url || url.toString(), host: finalHost, text: [text, ...extra].join("\n").slice(0, 200_000) };
}
