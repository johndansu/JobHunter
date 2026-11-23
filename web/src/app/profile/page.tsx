import { connection } from "next/server";
import { Suspense } from "react";
import { removeCvAction, saveProfileAction, uploadCvAction } from "@/app/actions";
import { AiModeNote } from "@/components/bits";
import { COUNTRY_CODES, countryName } from "@/server/lib/geo";
import { relatedTitles } from "@/server/lib/match";
import { CATEGORIES } from "@/server/lib/normalize";
import { EMPTY_PROFILE } from "@/server/lib/profile";
import { getProfile } from "@/server/matching";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function ProfilePage({ searchParams }: { searchParams: SP }) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ProfileView searchParams={searchParams} />
    </Suspense>
  );
}

const input = "w-full rounded border border-line bg-bg px-2 py-1.5";
const SENIORITY = ["Intern", "Junior", "Mid", "Senior", "Lead/Manager", "Principal/Staff", "Director+"];

async function ProfileView({ searchParams }: { searchParams: SP }) {
  await connection();
  const sp = await searchParams;
  const row = await getProfile();
  const p = row?.data ?? EMPTY_PROFILE;
  const cv = row?.cv ?? null;
  const suggestions = relatedTitles(p.targetTitles).filter((t) => !p.targetTitles.includes(t));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Your profile</h1>
        <p className="text-sm text-muted">Private, and stored only on this computer. Matches are scored from what you confirm here.</p>
      </div>
      <AiModeNote />
      {typeof sp.error === "string" ? <p className="rounded bg-bad-soft px-3 py-2 text-sm text-bad">{sp.error}</p> : null}
      {sp.uploaded ? <p className="rounded bg-good-soft px-3 py-2 text-sm text-good">CV read. Check what was found below, fix anything wrong, then save.</p> : null}
      {sp.removed ? <p className="rounded bg-good-soft px-3 py-2 text-sm text-good">Your CV text was removed. Your confirmed profile fields are kept.</p> : null}

      <section className="rounded-lg border border-line bg-surface p-4">
        <h2 className="font-medium">1. Upload your CV</h2>
        <p className="mt-1 text-sm text-muted">PDF, Word (.docx) or plain text. Single-column CVs read best.</p>
        <form action={uploadCvAction} className="mt-3 flex flex-wrap items-center gap-3">
          <input type="file" name="cv" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="text-sm" />
          <button className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white">Read CV</button>
        </form>
        {cv ? (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Read from <strong className="text-ink">{cv.fileName}</strong> on {new Date(cv.uploadedAt).toLocaleDateString("en-GB")}</span>
              <form action={removeCvAction}><button className="text-xs text-bad underline">Remove CV text</button></form>
            </div>
            {cv.warnings.map((w, i) => <p key={i} className="rounded bg-warn-soft px-3 py-2 text-warn">{w}</p>)}
            <div>
              <div className="font-medium">Roles found ({cv.roles.length}){cv.totalYears != null ? ` · ${cv.totalYears} years in total (overlaps counted once)` : ""}</div>
              <ul className="mt-1 space-y-1">
                {cv.roles.map((r, i) => (
                  <li key={i} className="rounded border border-line px-3 py-2">
                    <span className="font-medium">{r.title}</span>{r.employer ? ` at ${r.employer}` : ""} · {r.start} – {r.end}
                    {r.flags.length ? <span className="ml-2 text-xs text-warn">check: {r.flags.join(", ")}</span> : null}
                    <div className="mt-1 whitespace-pre-line text-xs text-muted">&ldquo;{r.quote}&rdquo;</div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-medium">Skills found ({cv.skills.length})</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {cv.skills.map((s) => <span key={s.skill} title={s.quote} className="rounded bg-accent-soft px-2 py-0.5 text-xs text-accent">{s.skill}</span>)}
              </div>
            </div>
            {cv.education.length ? <div><div className="font-medium">Education</div>{cv.education.map((e, i) => <div key={i} className="text-muted">{e.text}</div>)}</div> : null}
          </div>
        ) : null}
      </section>

      <form action={saveProfileAction} className="space-y-4 rounded-lg border border-line bg-surface p-4 text-sm">
        <h2 className="font-medium">2. Confirm your profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-medium">Target roles (one per line)</span>
            <textarea name="targetTitles" rows={4} defaultValue={p.targetTitles.join("\n")} className={input} placeholder={"Customer Support Specialist\nTechnical Support Engineer"} />
            {suggestions.length ? <span className="mt-1 block text-xs text-muted">Related titles you could add: {suggestions.join(" · ")}</span> : null}
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Skills (one per line or comma-separated)</span>
            <textarea name="skills" rows={4} defaultValue={p.skills.join(", ")} className={input} />
            <span className="mt-1 block text-xs text-muted">Only list skills you'd be happy to be asked about in an interview.</span>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Seniority</span>
            <select name="seniority" defaultValue={p.seniority ?? ""} className={input}>
              <option value="">Not sure</option>
              {SENIORITY.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Years of experience</span>
            <input name="years" type="number" step="0.5" min="0" max="50" defaultValue={p.years ?? ""} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Languages (one per line, with level)</span>
            <textarea name="languages" rows={3} defaultValue={p.languages.map((l) => `${l.language}: ${l.level}`).join("\n")} className={input} placeholder={"English: C2\nFrench: B1"} />
          </label>
          <fieldset>
            <legend className="mb-1 font-medium">Categories you're open to</legend>
            <div className="grid grid-cols-2 gap-1">
              {CATEGORIES.map((c) => (
                <label key={c} className="flex items-center gap-2 text-xs"><input type="checkbox" name="categories" value={c} defaultChecked={p.categories.includes(c)} /> {c}</label>
              ))}
            </div>
          </fieldset>
        </div>

        <h3 className="pt-2 font-medium">Where and how you can work</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block">Country you live in</span>
            <select name="country" defaultValue={p.country} className={input}>
              {COUNTRY_CODES.map((c) => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n)).map(({ c, n }) => <option key={c} value={c}>{n}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block">Time zone (IANA)</span>
            <input name="timezone" defaultValue={p.timezone} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block">Hours you'd shift your workday</span>
            <input name="shiftHours" type="number" min="0" max="8" defaultValue={p.shiftHours} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block">Citizenships (country codes, e.g. NG)</span>
            <input name="citizenships" defaultValue={p.citizenships.join(", ")} className={input} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block">Work permits (e.g. &ldquo;GB until 2027-05&rdquo;, one per line)</span>
            <textarea name="permits" rows={2} defaultValue={p.permits.map((x) => `${x.country}${x.expires ? ` until ${x.expires}` : ""}`).join("\n")} className={input} />
          </label>
          <fieldset>
            <legend className="mb-1">Engagement types</legend>
            {(["employee", "contractor", "eor"] as const).map((e) => (
              <label key={e} className="mr-3 inline-flex items-center gap-1"><input type="checkbox" name="engagements" value={e} defaultChecked={p.engagements.includes(e)} /> {e === "eor" ? "through an employer of record" : e}</label>
            ))}
          </fieldset>
          <label className="block">
            <span className="mb-1 block">Minimum pay</span>
            <div className="flex gap-1">
              <input name="salaryAmount" type="number" min="0" defaultValue={p.salaryFloor?.amount ?? ""} className={input} />
              <input name="salaryCurrency" defaultValue={p.salaryFloor?.currency ?? "USD"} className={`${input} w-20`} />
              <select name="salaryPeriod" defaultValue={p.salaryFloor?.period ?? "year"} className={`${input} w-24`}><option>year</option><option>month</option><option>hour</option></select>
            </div>
          </label>
          <label className="flex items-center gap-2"><input type="checkbox" name="includeUnclear" defaultChecked={p.includeUnclear} /> Include jobs whose location rules are unclear</label>
        </div>
        <p className="text-xs text-muted">Citizenship and permits are only ever used to filter jobs. The app never answers authorization questions for you.</p>
        <button className="rounded bg-accent px-4 py-2 font-medium text-white">Save and find matches</button>
      </form>
    </div>
  );
}
