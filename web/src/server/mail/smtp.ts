import nodemailer from "nodemailer";

/**
 * Gmail app-password fallback (MAIL-02): SMTP to smtp.gmail.com with the
 * message passed as `raw`, so the bytes the candidate approved are the bytes
 * sent. Host and port can be overridden for local tests only.
 */
export type SmtpOptions = { host: string; port: number; secure: boolean; user: string; pass: string; tlsRejectUnauthorized?: boolean };

export const gmailSmtp = (user: string, pass: string): SmtpOptions => ({
  host: process.env.SMTP_HOST_OVERRIDE || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT_OVERRIDE || 465),
  secure: !process.env.SMTP_PORT_OVERRIDE || process.env.SMTP_PORT_OVERRIDE === "465",
  user,
  pass,
});

function transporter(o: SmtpOptions) {
  return nodemailer.createTransport({
    host: o.host,
    port: o.port,
    secure: o.secure,
    auth: { user: o.user, pass: o.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: o.tlsRejectUnauthorized === false ? { rejectUnauthorized: false } : undefined,
  });
}

export async function smtpVerify(o: SmtpOptions): Promise<void> {
  await transporter(o).verify();
}

export async function smtpSend(o: SmtpOptions, mime: string, envelope: { from: string; to: string[] }): Promise<{ response: string }> {
  const info = await transporter(o).sendMail({ envelope, raw: mime });
  return { response: String(info.response ?? "") };
}

/** Turn SMTP errors into plain words; never include the password. */
export function smtpErrorText(e: unknown): { text: string; auth: boolean } {
  const err = e as { code?: string; responseCode?: number; message?: string };
  if (err.code === "EAUTH" || err.responseCode === 535 || err.responseCode === 534)
    return { text: "Gmail rejected the app password. It may have been revoked (Google revokes app passwords when you change your account password). Create a new one and reconnect.", auth: true };
  if (err.code === "ETIMEDOUT" || err.code === "ECONNECTION" || err.code === "ESOCKET") return { text: "Couldn't reach Gmail's mail server. Check your internet connection.", auth: false };
  return { text: `Gmail didn't accept the message: ${(err.message ?? "unknown error").replace(/pass(word)?\S*/gi, "…").slice(0, 200)}`, auth: false };
}
