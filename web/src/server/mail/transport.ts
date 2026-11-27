import { eq } from "drizzle-orm";
import { db } from "../db";
import { mailAccount } from "../db/schema";
import { decrypt, encrypt } from "../secret";
import { GmailError, gmailSend, gmailThread, revoke, SCOPE_METADATA, type ThreadMessage } from "./gmail";
import { gmailSmtp, smtpErrorText, smtpSend, smtpVerify } from "./smtp";

/**
 * One MailTransport interface (MAIL-01) over the two Gmail methods: Google's API
 * with the owner's own OAuth client, or SMTP with an app password. Other
 * providers can be added behind the same interface later (D-17).
 */
export interface MailTransport {
  method: "gmail_oauth" | "gmail_app_password";
  email: string;
  send(mime: string, o: { to: string[]; threadId: string | null }): Promise<{ providerId: string | null; threadId: string | null }>;
  /** Reply detection, when the account allows it (OAuth with gmail.metadata). */
  thread?(threadId: string): Promise<ThreadMessage[]>;
}

export class SendError extends Error {
  constructor(message: string, readonly auth: boolean, readonly retryable: boolean) {
    super(message);
  }
}

export type Account = typeof mailAccount.$inferSelect;

export async function getAccount(): Promise<Account | null> {
  const [a] = await db.select().from(mailAccount).where(eq(mailAccount.id, 1));
  return a ?? null;
}

export async function saveAccount(o: { method: Account["method"]; email: string; name: string | null; secret: string; scopes: string }) {
  const values = { method: o.method, email: o.email, name: o.name, secret: encrypt(o.secret), scopes: o.scopes, replyDetection: o.scopes.includes(SCOPE_METADATA), connectedAt: new Date(), lastError: null, lastErrorAt: null };
  await db.insert(mailAccount).values({ id: 1, ...values }).onConflictDoUpdate({ target: mailAccount.id, set: values });
}

export async function disconnect() {
  const a = await getAccount();
  if (a?.method === "gmail_oauth") await revoke(decrypt(a.secret));
  await db.delete(mailAccount).where(eq(mailAccount.id, 1));
}

export async function markOk() {
  await db.update(mailAccount).set({ lastOkAt: new Date(), lastError: null, lastErrorAt: null }).where(eq(mailAccount.id, 1));
}

export async function markError(text: string) {
  await db.update(mailAccount).set({ lastError: text, lastErrorAt: new Date() }).where(eq(mailAccount.id, 1));
}

export function transportFor(a: Account): MailTransport {
  const secret = decrypt(a.secret);
  if (a.method === "gmail_oauth") {
    return {
      method: a.method,
      email: a.email,
      async send(mime, o) {
        try {
          const r = await gmailSend(secret, mime, o.threadId);
          return { providerId: r.id, threadId: r.threadId };
        } catch (e) {
          if (e instanceof GmailError) throw new SendError(e.message, e.kind === "auth", e.kind === "network" || e.kind === "quota");
          throw e;
        }
      },
      ...(a.scopes.includes(SCOPE_METADATA) ? { thread: (id: string) => gmailThread(secret, id) } : {}),
    };
  }
  const opts = gmailSmtp(a.email, secret);
  return {
    method: a.method,
    email: a.email,
    async send(mime, o) {
      try {
        await smtpSend(opts, mime, { from: a.email, to: o.to });
        return { providerId: null, threadId: null };
      } catch (e) {
        const { text, auth } = smtpErrorText(e);
        throw new SendError(text, auth, !auth);
      }
    },
  };
}

/** Check an app password before saving it. */
export async function verifyAppPassword(email: string, pass: string): Promise<string | null> {
  try {
    await smtpVerify(gmailSmtp(email, pass));
    return null;
  } catch (e) {
    return smtpErrorText(e).text;
  }
}
