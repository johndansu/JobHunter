"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { dismissals, matches } from "@/server/db/schema";
import { extractCvText, parseCvText } from "@/server/lib/cv";
import { EMPTY_PROFILE, profileFromForm } from "@/server/lib/profile";
import { getProfile, recomputeMatches, saveProfile, setOtherProfile } from "@/server/matching";
import { readLinkedInExport, readProfileDocument, type OtherProfile } from "@/server/lib/consistency";
import { eq } from "drizzle-orm";

const MAX_CV_BYTES = 8 * 1024 * 1024;

/** Read an uploaded CV with rules (no-AI mode) and pre-fill the profile. The candidate reviews it next. */
export async function uploadCvAction(formData: FormData) {
  const file = formData.get("cv");
  if (!(file instanceof File) || !file.size) redirect("/profile?error=Choose%20a%20PDF%2C%20Word%20or%20text%20file");
  if (file.size > MAX_CV_BYTES) redirect("/profile?error=That%20file%20is%20over%208%20MB");
  let text = "";
  try {
    text = await extractCvText({ name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
  } catch {
    text = "";
  }
  if (text.trim().length < 50) redirect("/profile?error=No%20text%20found%20in%20that%20file.%20If%20it%27s%20a%20scanned%20PDF%2C%20upload%20a%20Word%20or%20text%20version.");
  const parse = parseCvText(text);
  const current = (await getProfile())?.data ?? EMPTY_PROFILE;
  const langs = [...current.languages];
  for (const l of parse.languages) if (!langs.some((x) => x.language === l.language)) langs.push({ language: l.language, level: l.level ?? "B2" });
  await saveProfile(
    {
      ...current,
      skills: [...new Set([...current.skills, ...parse.skills.map((s) => s.skill)])],
      years: current.years ?? parse.totalYears,
      seniority: current.seniority ?? parse.seniorityGuess,
      targetTitles: current.targetTitles.length ? current.targetTitles : parse.roles.slice(0, 1).map((r) => r.title),
      languages: langs,
    },
    { ...parse, fileName: file.name, uploadedAt: new Date().toISOString(), text },
  );
  await recomputeMatches();
  redirect("/profile?uploaded=1");
}

export async function saveProfileAction(formData: FormData) {
  const current = (await getProfile())?.data ?? EMPTY_PROFILE;
  await saveProfile(profileFromForm(formData, current));
  await recomputeMatches();
  redirect("/matches");
}

export async function removeCvAction() {
  const current = await getProfile();
  if (current) await saveProfile(current.data, null);
  redirect("/profile?removed=1");
}

/** LinkedIn data export (ZIP or its CSVs) or a saved profile PDF, for the consistency check (DOC-13). */
export async function uploadProfileExportAction(formData: FormData) {
  const files = formData.getAll("export").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) redirect("/profile?error=Choose%20your%20LinkedIn%20export%20(ZIP%20or%20CSV)%20or%20a%20saved%20profile%20PDF#consistency");
  if (files.some((f) => f.size > 25 * 1024 * 1024)) redirect("/profile?error=That%20file%20is%20over%2025%20MB#consistency");
  const loaded = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) })));
  let other: OtherProfile | null = null;
  try {
    other = readLinkedInExport(loaded);
    if (!other) {
      const doc = loaded.find((f) => /\.(pdf|docx|txt)$/i.test(f.name));
      if (doc) {
        const text = await extractCvText(doc);
        if (text.trim().length > 50) other = readProfileDocument(text, doc.name);
      }
    }
  } catch {
    other = null;
  }
  if (!other) redirect("/profile?error=Couldn%27t%20read%20that.%20Upload%20LinkedIn%27s%20data%20export%20ZIP%20(or%20Positions.csv)%2C%20or%20your%20profile%20saved%20as%20PDF.#consistency");
  await setOtherProfile({ ...other, uploadedAt: new Date().toISOString() });
  redirect("/profile?checked=1#consistency");
}

export async function removeProfileExportAction() {
  await setOtherProfile(null);
  redirect("/profile#consistency");
}

export async function dismissAction(formData: FormData) {
  const jobId = Number(formData.get("jobId"));
  const back = String(formData.get("back") || "/matches");
  if (jobId > 0) {
    await db.insert(dismissals).values({ jobId }).onConflictDoNothing();
    await db.delete(matches).where(eq(matches.jobId, jobId));
  }
  redirect(back.startsWith("/") ? back : "/matches");
}
