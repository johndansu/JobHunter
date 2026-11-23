"use server";

import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { dismissals, matches } from "@/server/db/schema";
import { extractCvText, parseCvText } from "@/server/lib/cv";
import { EMPTY_PROFILE, profileFromForm } from "@/server/lib/profile";
import { getProfile, recomputeMatches, saveProfile } from "@/server/matching";
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

export async function dismissAction(formData: FormData) {
  const jobId = Number(formData.get("jobId"));
  const back = String(formData.get("back") || "/matches");
  if (jobId > 0) {
    await db.insert(dismissals).values({ jobId }).onConflictDoNothing();
    await db.delete(matches).where(eq(matches.jobId, jobId));
  }
  redirect(back.startsWith("/") ? back : "/matches");
}
