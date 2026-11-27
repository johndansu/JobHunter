import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { SMTPServer } from "smtp-server";
import { buildMime, mimeHash } from "../lib/mime";
import { gmailSend, gmailThread } from "./gmail";
import { smtpErrorText, smtpSend } from "./smtp";

// Fictional sender and recipient.
const mime = buildMime({
  from: { name: "Ada Sample", email: "ada.sample@example.com" },
  to: ["jobs@acme.example"],
  subject: "Job application – Support Lead – Adá Sample",
  text: "Dear Acme hiring team,\n\nI'm applying for the Support Lead role. Café.\n\nKind regards,\nAda Sample",
  date: new Date(Date.UTC(2026, 10, 26, 9, 0, 0)),
  messageId: "fixed.1@example.com",
  attachments: [{ filename: "Ada-Sample-CV.pdf", contentType: "application/pdf", bytes: new Uint8Array(3000).map((_, i) => (i * 7) % 256) }],
});

describe("SMTP (app password) sends the approved bytes unchanged", () => {
  let server: SMTPServer;
  let port = 0;
  const received: { from: string; to: string[]; data: Buffer }[] = [];
  beforeAll(async () => {
    server = new SMTPServer({
      secure: false,
      authOptional: false,
      allowInsecureAuth: true,
      disabledCommands: ["STARTTLS"],
      onAuth: (auth, _s, cb) => (auth.username === "ada.sample@example.com" && auth.password === "abcd efgh ijkl mnop" ? cb(null, { user: auth.username }) : cb(new Error("Invalid login"))),
      onData: (stream, session, cb) => {
        const chunks: Buffer[] = [];
        stream.on("data", (c: Buffer) => chunks.push(c));
        stream.on("end", () => {
          received.push({ from: String(session.envelope.mailFrom && session.envelope.mailFrom.address), to: session.envelope.rcptTo.map((r) => r.address), data: Buffer.concat(chunks) });
          cb();
        });
      },
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    port = (server.server.address() as { port: number }).port;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("delivers a message byte-identical to the preview", async () => {
    await smtpSend({ host: "127.0.0.1", port, secure: false, user: "ada.sample@example.com", pass: "abcd efgh ijkl mnop" }, mime, { from: "ada.sample@example.com", to: ["jobs@acme.example"] });
    expect(received).toHaveLength(1);
    expect(received[0].to).toEqual(["jobs@acme.example"]);
    expect(received[0].from).toBe("ada.sample@example.com");
    // SMTP DATA ends lines with CRLF; the server strips the final terminator. Same bytes, same hash.
    const got = received[0].data.toString("utf8");
    expect(mimeHash(got.endsWith("\r\n") ? got : `${got}\r\n`)).toBe(mimeHash(mime));
  }, 20000);

  it("explains a rejected app password without echoing it", async () => {
    const err = await smtpSend({ host: "127.0.0.1", port, secure: false, user: "ada.sample@example.com", pass: "wrong-secret" }, mime, { from: "ada.sample@example.com", to: ["jobs@acme.example"] }).catch((e) => e);
    const t = smtpErrorText(err);
    expect(t.auth).toBe(true);
    expect(t.text).not.toMatch(/wrong-secret/);
  }, 20000);
});

describe("Gmail API sends the approved bytes, in the right thread", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uploads the exact MIME as message/rfc822 with the thread id", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "at-1", expires_in: 3600 }), { status: 200 });
      return new Response(JSON.stringify({ id: "m1", threadId: "t9" }), { status: 200 });
    });
    const r = await gmailSend("refresh-1", mime, "t9");
    expect(r).toEqual({ id: "m1", threadId: "t9" });
    const send = calls.find((c) => c.url.includes("/upload/gmail/v1/users/me/messages/send?uploadType=multipart"))!;
    expect((send.init.headers as Record<string, string>).Authorization).toBe("Bearer at-1");
    const body = (send.init.body as Buffer).toString("utf8");
    expect(body).toContain('{"threadId":"t9"}');
    expect(body).toContain(`Content-Type: message/rfc822\r\n\r\n${mime}\r\n--`);
    const token = calls.find((c) => c.url.includes("token"))!;
    expect(String(token.init.body)).toContain("grant_type=refresh_token");
  });
  it("reads only headers for reply detection and spots auto-replies", async () => {
    vi.stubGlobal("fetch", async (url: string) => {
      if (url.includes("token")) return new Response(JSON.stringify({ access_token: "at-2", expires_in: 3600 }), { status: 200 });
      expect(url).toContain("format=metadata");
      return new Response(JSON.stringify({ messages: [
        { id: "a", internalDate: "1764147600000", labelIds: ["SENT"], payload: { headers: [{ name: "From", value: "Ada <ada.sample@example.com>" }] } },
        { id: "b", internalDate: "1764151200000", labelIds: ["INBOX"], payload: { headers: [{ name: "From", value: "Acme <jobs@acme.example>" }, { name: "Auto-Submitted", value: "auto-replied" }] } },
        { id: "c", internalDate: "1764237600000", labelIds: ["INBOX"], payload: { headers: [{ name: "From", value: "Kim <kim@acme.example>" }, { name: "Subject", value: "Re: Job application" }] } },
      ] }), { status: 200 });
    });
    const msgs = await gmailThread("refresh-2", "t9");
    expect(msgs.map((m) => [m.id, m.sentByMe, m.autoReply])).toEqual([["a", true, false], ["b", false, true], ["c", false, false]]);
  });
  it("turns a revoked token into a reconnect message", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }));
    await expect(gmailSend("revoked-refresh", mime, null)).rejects.toThrow(/Connect Gmail again/);
  });
});
