"use server";

import { redirect } from "next/navigation";
import {
  STAGES,
  approveDocument,
  deleteApplication,
  refreshPreflight,
  regenerateDocument,
  saveDocument,
  saveNotes,
  setAiOptOut,
  setStage,
  startApplication,
  type Stage,
  startSpeculative,
} from "@/server/applications";
import { fetchCompanyPage } from "@/server/companyPage";
import { approveAndQueue, cancelEmail, confirmReply, dismissReply, ensureDraft, prepareMessage, processQueue, sendTestToSelf, updateDraft } from "@/server/outbox";

const idOf = (f: FormData) => Number(f.get("applicationId"));
const kindOf = (f: FormData) => (f.get("kind") === "letter" ? "letter" : "cv");
const back = (id: number, msg?: { error?: string; ok?: string }, hash = "") =>
  redirect(`/applications/${id}${msg?.error ? `?error=${encodeURIComponent(msg.error)}` : msg?.ok ? `?ok=${encodeURIComponent(msg.ok)}` : ""}${hash}`);

export async function startApplicationAction(formData: FormData) {
  const jobId = Number(formData.get("jobId"));
  const r = await startApplication(jobId);
  if ("error" in r) redirect(`/jobs/${jobId}?error=${encodeURIComponent(r.error)}`);
  redirect(`/applications/${r.id}`);
}

export async function saveDocAction(formData: FormData) {
  const id = idOf(formData);
  const kind = kindOf(formData);
  const r = await saveDocument(id, kind, String(formData.get("content") ?? ""));
  back(id, "error" in r ? { error: r.error } : { ok: "Saved. Checks ran again." }, `#${kind}`);
}

export async function regenerateDocAction(formData: FormData) {
  const id = idOf(formData);
  const kind = kindOf(formData);
  const r = await regenerateDocument(id, kind);
  back(id, "error" in r ? { error: r.error } : { ok: "Rebuilt from your CV." }, `#${kind}`);
}

export async function approveDocAction(formData: FormData) {
  const id = idOf(formData);
  const kind = kindOf(formData);
  const r = await approveDocument(id, kind);
  back(id, "error" in r ? { error: r.error } : { ok: `${kind === "cv" ? "CV" : "Letter"} approved. You can download it now.` }, `#${kind}`);
}

export async function stageAction(formData: FormData) {
  const id = idOf(formData);
  const stage = String(formData.get("stage")) as Stage;
  if (STAGES.includes(stage)) await setStage(id, stage);
  back(id);
}

export async function aiOptOutAction(formData: FormData) {
  const id = idOf(formData);
  const choice = formData.get("choice") === "opted_out" ? "opted_out" : "stayed_in";
  await setAiOptOut(id, choice);
  back(id, { ok: "Your choice is saved in this application's log." });
}

export async function notesAction(formData: FormData) {
  const id = idOf(formData);
  await saveNotes(id, String(formData.get("notes") ?? ""));
  back(id, { ok: "Notes saved." });
}

export async function preflightAction(formData: FormData) {
  const id = idOf(formData);
  await refreshPreflight(id);
  back(id, { ok: "Pre-flight checked again." });
}

export async function deleteApplicationAction(formData: FormData) {
  await deleteApplication(idOf(formData));
  redirect("/applications");
}

// ---------- email (Phase 4) ----------

const emailBack = (id: number, msg?: { error?: string; ok?: string }) => back(id, msg, "#email");

export async function emailDraftAction(formData: FormData) {
  const id = idOf(formData);
  const r = await ensureDraft(id);
  emailBack(id, "id" in r ? undefined : { error: r.error }); // outbox rows have their own `error` column, so test for `id`
}

export async function saveEmailAction(formData: FormData) {
  const id = idOf(formData);
  const emailId = Number(formData.get("emailId"));
  const fmt = (v: FormDataEntryValue | null) => (v === "pdf" || v === "docx" ? v : null);
  const r = await updateDraft(emailId, {
    toAddr: formData.has("to") ? String(formData.get("to")) : undefined,
    subject: String(formData.get("subject") ?? ""),
    body: String(formData.get("body") ?? ""),
    attach: { cv: fmt(formData.get("attachCv")), letter: fmt(formData.get("attachLetter")) },
    overrides: formData.getAll("override").map(String),
  });
  emailBack(id, "error" in r ? { error: r.error } : { ok: "Saved. Checks ran again." });
}

export async function prepareEmailAction(formData: FormData) {
  const id = idOf(formData);
  const r = await prepareMessage(Number(formData.get("emailId")));
  emailBack(id, "error" in r ? { error: r.error } : { ok: "Here's the exact message. Read it, then approve it to queue it." });
}

export async function approveEmailAction(formData: FormData) {
  const id = idOf(formData);
  if (formData.get("confirm") !== "on") emailBack(id, { error: "Tick the box to confirm you've read the message." });
  const r = await approveAndQueue(Number(formData.get("emailId")), String(formData.get("hash") ?? ""));
  if ("error" in r) emailBack(id, { error: r.error });
  else {
    await processQueue().catch(() => undefined); // sends now if its slot has come
    emailBack(id, { ok: r.sendAt.getTime() - Date.now() < 30_000 ? "Approved. Sending now." : `Approved. It goes out at ${r.sendAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} to keep a gap between sends; you can cancel until then.` });
  }
}

export async function cancelEmailAction(formData: FormData) {
  const id = idOf(formData);
  const r = await cancelEmail(Number(formData.get("emailId")));
  emailBack(id, "error" in r ? { error: r.error } : { ok: "Cancelled. It's a draft again." });
}

export async function testEmailAction(formData: FormData) {
  const id = idOf(formData);
  const r = await sendTestToSelf(Number(formData.get("emailId")));
  emailBack(id, "error" in r ? { error: r.error } : { ok: `Test sent to your own address. Message hash ${r.hash.slice(0, 12)}…` });
}

export async function replyAction(formData: FormData) {
  const id = idOf(formData);
  const category = String(formData.get("category")) as "interview" | "rejection" | "info" | "other";
  if (!["interview", "rejection", "info", "other"].includes(category)) emailBack(id);
  const eventId = Number(formData.get("eventId")) || undefined;
  await confirmReply({ applicationId: id, eventId, category });
  emailBack(id, { ok: "Reply recorded. Pending follow-ups were cancelled." });
}

export async function dismissReplyAction(formData: FormData) {
  const id = idOf(formData);
  await dismissReply(id, Number(formData.get("eventId")));
  emailBack(id);
}

/** Speculative application (MAIL-19): the company's own careers page must publish the address. */
export async function startSpeculativeAction(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  const roleArea = String(formData.get("roleArea") ?? "").trim();
  const page = String(formData.get("page") ?? "").trim();
  const fail = (m: string) => redirect(`/speculative?error=${encodeURIComponent(m)}&company=${encodeURIComponent(company)}&roleArea=${encodeURIComponent(roleArea)}&page=${encodeURIComponent(page)}`);
  if (company.length < 2 || roleArea.length < 3 || !page) fail("Fill in the company, the kind of role, and the page with their careers address.");
  const fetched = await fetchCompanyPage(page);
  if ("error" in fetched) fail(fetched.error);
  else {
    const r = await startSpeculative({ company, roleArea, pageUrl: fetched.url, pageText: fetched.text, domain: fetched.host.replace(/^www\./, "") });
    if ("error" in r) fail(r.error);
    else redirect(`/applications/${r.id}`);
  }
}
