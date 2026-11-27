import { createHash, randomBytes } from "node:crypto";

/**
 * Gmail over Google's own APIs (MAIL-02): a Google Cloud OAuth client the owner
 * creates with their own account, asking only for gmail.send (and, if reply
 * detection is switched on, gmail.metadata: headers, never bodies). Plain fetch
 * against Google's documented endpoints; no Google SDK.
 */

export const SCOPE_SEND = "https://www.googleapis.com/auth/gmail.send";
export const SCOPE_METADATA = "https://www.googleapis.com/auth/gmail.metadata";
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const REVOKE = "https://oauth2.googleapis.com/revoke";
const API = "https://gmail.googleapis.com";

export const oauthConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export class GmailError extends Error {
  constructor(message: string, readonly kind: "auth" | "quota" | "rejected" | "network") {
    super(message);
  }
}

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function pkce() {
  const verifier = b64url(randomBytes(32));
  return { verifier, challenge: b64url(createHash("sha256").update(verifier).digest()) };
}

export function authUrl(o: { redirectUri: string; state: string; challenge: string; replies: boolean; loginHint?: string | null }): string {
  const scopes = ["openid", "email", SCOPE_SEND, ...(o.replies ? [SCOPE_METADATA] : [])];
  const q = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: o.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: o.state,
    code_challenge: o.challenge,
    code_challenge_method: "S256",
    ...(o.loginHint ? { login_hint: o.loginHint } : {}),
  });
  return `${AUTH}?${q}`;
}

type TokenResponse = { access_token: string; expires_in: number; refresh_token?: string; scope?: string; id_token?: string; error?: string; error_description?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body), signal: AbortSignal.timeout(15000) });
  } catch (e) {
    throw new GmailError(`Couldn't reach Google (${(e as Error).message})`, "network");
  }
  const j = (await res.json().catch(() => ({}))) as TokenResponse;
  if (!res.ok || j.error) {
    const auth = j.error === "invalid_grant" || j.error === "invalid_client" || j.error === "unauthorized_client";
    throw new GmailError(auth ? "Google no longer accepts JobHunter's access (revoked, password changed, or the OAuth client was deleted). Connect Gmail again." : `Google refused the request: ${j.error_description ?? j.error ?? res.status}`, auth ? "auth" : "rejected");
  }
  return j;
}

/** Exchange the sign-in code for tokens; returns the refresh token, granted scopes and the account's email. */
export async function exchangeCode(o: { code: string; verifier: string; redirectUri: string }) {
  const t = await tokenRequest({ code: o.code, client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", redirect_uri: o.redirectUri, grant_type: "authorization_code", code_verifier: o.verifier });
  if (!t.refresh_token) throw new GmailError("Google didn't return a long-lived token. Remove JobHunter at myaccount.google.com/permissions and connect again.", "rejected");
  // The id_token comes straight from Google's token endpoint over TLS, so its claims can be read without re-verifying the signature.
  const claims = t.id_token ? JSON.parse(Buffer.from(t.id_token.split(".")[1], "base64url").toString("utf8")) as { email?: string; email_verified?: boolean } : {};
  if (!claims.email) throw new GmailError("Google didn't share the account's email address.", "rejected");
  return { refreshToken: t.refresh_token, scopes: t.scope ?? "", email: claims.email.toLowerCase(), accessToken: t.access_token, expiresAt: Date.now() + t.expires_in * 1000 };
}

const accessCache = new Map<string, { token: string; until: number }>();

export async function accessToken(refreshToken: string): Promise<string> {
  const key = createHash("sha256").update(refreshToken).digest("hex");
  const hit = accessCache.get(key);
  if (hit && hit.until > Date.now() + 60_000) return hit.token;
  const t = await tokenRequest({ refresh_token: refreshToken, client_id: process.env.GOOGLE_CLIENT_ID ?? "", client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "", grant_type: "refresh_token" });
  accessCache.set(key, { token: t.access_token, until: Date.now() + t.expires_in * 1000 });
  return t.access_token;
}

async function gmailFetch(token: string, url: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000) });
  } catch (e) {
    throw new GmailError(`Couldn't reach Gmail (${(e as Error).message})`, "network");
  }
  if (res.status === 401 || res.status === 403) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new GmailError(`Gmail refused: ${j.error?.message ?? res.status}. Connect Gmail again.`, "auth");
  }
  if (res.status === 429) throw new GmailError("Gmail's sending limit was hit. The email stays queued; try again later.", "quota");
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new GmailError(`Gmail returned ${res.status}: ${j.error?.message ?? "unknown error"}`, res.status >= 500 ? "network" : "rejected");
  }
  return res;
}

/**
 * Send the exact MIME bytes (MAIL-07) with Gmail's media upload, in a thread when
 * following up. Gmail may add its own transport headers; the message itself is ours.
 */
export async function gmailSend(refreshToken: string, mime: string, threadId: string | null): Promise<{ id: string; threadId: string }> {
  const token = await accessToken(refreshToken);
  const boundary = `jh_${randomBytes(12).toString("hex")}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(threadId ? { threadId } : {})}\r\n--${boundary}\r\nContent-Type: message/rfc822\r\n\r\n`, "utf8"),
    Buffer.from(mime, "utf8"),
    Buffer.from(`\r\n--${boundary}--`, "utf8"),
  ]);
  const res = await gmailFetch(token, `${API}/upload/gmail/v1/users/me/messages/send?uploadType=multipart`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body });
  const j = (await res.json()) as { id: string; threadId: string };
  return { id: j.id, threadId: j.threadId };
}

export type ThreadMessage = { id: string; at: Date; from: string; subject: string; autoReply: boolean; sentByMe: boolean };

/** Headers of the messages in one thread (needs gmail.metadata). Never bodies. */
export async function gmailThread(refreshToken: string, threadId: string): Promise<ThreadMessage[]> {
  const token = await accessToken(refreshToken);
  const q = ["From", "Subject", "Auto-Submitted", "X-Autoreply", "X-Autorespond", "Precedence"].map((h) => `metadataHeaders=${h}`).join("&");
  const res = await gmailFetch(token, `${API}/gmail/v1/users/me/threads/${encodeURIComponent(threadId)}?format=metadata&${q}`);
  const j = (await res.json()) as { messages?: { id: string; internalDate: string; labelIds?: string[]; payload?: { headers?: { name: string; value: string }[] } }[] };
  return (j.messages ?? []).map((m) => {
    const h = (n: string) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n.toLowerCase())?.value ?? "";
    const subject = h("Subject");
    const auto = /auto-(replied|generated)/i.test(h("Auto-Submitted")) || !!h("X-Autoreply") || !!h("X-Autorespond") || /^(auto|bulk|junk)$/i.test(h("Precedence")) || /\b(automatic reply|auto(matic)?[- ]?reply|out of (the )?office|autoreply)\b/i.test(subject);
    return { id: m.id, at: new Date(Number(m.internalDate)), from: h("From"), subject, autoReply: auto, sentByMe: !!m.labelIds?.includes("SENT") };
  });
}

export async function revoke(refreshToken: string): Promise<void> {
  try {
    await fetch(`${REVOKE}?token=${encodeURIComponent(refreshToken)}`, { method: "POST", signal: AbortSignal.timeout(10000) });
  } catch {
    // Best effort: the local credential is deleted either way.
  }
}
