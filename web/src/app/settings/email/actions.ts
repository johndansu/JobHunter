"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { applicationEvents, applications, dismissals, documents, mailAccount, matches, outbox, profiles, replyEvents } from "@/server/db/schema";
import { EMAIL_RE } from "@/server/lib/recipients";
import { sendConnectionTest } from "@/server/outbox";
import { disconnect, saveAccount, verifyAppPassword } from "@/server/mail/transport";
import { getProfile } from "@/server/matching";
import { withCvDefaults } from "@/server/lib/cv";

const go = (q: string) => redirect(`/settings/email?${q}`);

/** App-password fallback: checked against Gmail before it's stored (encrypted). */
export async function connectAppPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const pass = String(formData.get("password") ?? "").replace(/\s+/g, "");
  if (!EMAIL_RE.test(email)) go("error=Enter%20your%20Gmail%20address");
  if (!/^[a-z]{16}$/i.test(pass)) go("error=An%20app%20password%20is%2016%20letters%20(Google%20shows%20it%20in%20four%20groups)");
  const problem = await verifyAppPassword(email, pass);
  if (problem) go(`error=${encodeURIComponent(problem)}`);
  const p = await getProfile();
  await saveAccount({ method: "gmail_app_password", email, name: p?.cv ? withCvDefaults(p.cv).contact.name : null, secret: pass, scopes: "smtp" });
  go("connected=1");
}

export async function disconnectAction() {
  await disconnect();
  go("disconnected=1");
}

export async function replyDetectionOffAction() {
  await db.update(mailAccount).set({ replyDetection: false }).where(eq(mailAccount.id, 1));
  go("ok=Reply%20detection%20is%20off.%20To%20remove%20the%20permission%20entirely%2C%20disconnect%20and%20connect%20again%20without%20it.");
}

export async function testSendAction() {
  const r = await sendConnectionTest();
  go("error" in r ? `error=${encodeURIComponent(r.error)}` : "ok=Test%20email%20sent%20to%20your%20own%20address.%20Check%20your%20inbox.");
}

/** Delete everything personal (AFT-13): profile, applications, documents, emails, replies, matches, the Gmail connection. Jobs stay. */
export async function deleteAllDataAction(formData: FormData) {
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") go("error=Type%20DELETE%20to%20confirm");
  await disconnect();
  await db.transaction(async (tx) => {
    await tx.delete(replyEvents);
    await tx.delete(outbox);
    await tx.delete(documents);
    await tx.delete(applicationEvents);
    await tx.delete(applications);
    await tx.delete(matches);
    await tx.delete(dismissals);
    await tx.delete(profiles);
  });
  go("ok=All%20your%20personal%20data%20was%20deleted.%20Job%20listings%20are%20kept.");
}
