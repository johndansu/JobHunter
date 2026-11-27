import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import {
  aiOptOutAction,
  approveDocAction,
  deleteApplicationAction,
  notesAction,
  preflightAction,
  regenerateDocAction,
  saveDocAction,
  stageAction,
} from "@/app/applications/actions";
import { EmailSection } from "./EmailSection";
import { ChangeLogView, EvidenceTable, FlagList, IdentityChecklist, ReadBackView } from "@/components/apply";
import { AiModeNote, timeAgo } from "@/components/bits";
import { STAGES, STAGE_LABEL, docProblems, followUpHint, getApplication } from "@/server/applications";
import type { DocRow } from "@/server/db/schema";
import { withCvDefaults } from "@/server/lib/cv";
import { compareProfiles } from "@/server/lib/consistency";
import { changeLog, classifyQuestions, parseCvDocText } from "@/server/lib/tailor";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function ApplicationPage(props: Props) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Workspace {...props} />
    </Suspense>
  );
}

const card = "rounded-lg border border-line bg-surface p-4";
const btn = "rounded border border-line bg-bg px-3 py-1.5 text-sm hover:border-ink/40";
const primary = "rounded bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40";

const AI_STANCE = {
  restricts: ["This employer restricts AI use in applications", "Write and edit everything yourself. JobHunter's drafts are built only from your own CV, but rewrite the letter and answers in your own words before you send them."],
  draft_first: ["This employer asks you to write your first draft yourself", "Write the letter and answers yourself first. Use the checks here only to review what you wrote."],
  allows: ["This employer says AI help is allowed", "Your application still has to be true and yours. If the form asks whether you used AI, answer honestly."],
  agent_trap: ["This posting tells AI agents not to apply", "It has a hidden line aimed at bots that apply automatically. JobHunter never applies for you: you read the posting and submit the form yourself, which is what the employer wants. If the form asks whether you used AI, answer honestly."],
  unknown: ["No AI policy found in the posting", "If the form asks whether you used AI, answer honestly."],
} as const;

async function Workspace({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const data = await getApplication(Number(id));
  if (!data) notFound();
  const { app, job, cv, letter, events, profile } = data;
  const pf = app.preflight;
  const master = profile?.cv ? withCvDefaults(profile.cv) : null;
  const questions = pf ? classifyQuestions(pf.form.fields, master) : [];
  const knockouts = questions.filter((q) => q.kind === "sensitive" && /Knockout/.test(q.guidance));
  const hint = followUpHint(app);
  const hidden = { name: "applicationId", value: app.id };

  return (
    <div className="space-y-5">
      <div>
        <Link href="/applications" className="text-sm text-muted hover:text-ink">← All applications</Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">{job ? job.title : `Speculative application: ${app.specRole ?? ""}`}</h1>
            <p className="text-muted">
              {job ? <Link href={`/jobs/${job.id}`} className="underline">{job.company}</Link> : <span>{app.specCompany}</span>} · started {timeAgo(app.createdAt)}
              {app.appliedAt ? ` · applied ${timeAgo(app.appliedAt)}` : ""}
            </p>
          </div>
          <form action={stageAction} className="flex flex-wrap items-center gap-2 text-sm">
            <input type="hidden" {...hidden} />
            <select name="stage" defaultValue={app.stage} className="rounded border border-line bg-bg px-2 py-1.5">
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
            </select>
            <button className={btn}>Update stage</button>
          </form>
        </div>
      </div>
      <AiModeNote />
      {typeof sp.error === "string" ? <p className="rounded bg-bad-soft px-3 py-2 text-sm text-bad">{sp.error}</p> : null}
      {typeof sp.ok === "string" ? <p className="rounded bg-good-soft px-3 py-2 text-sm text-good">{sp.ok}</p> : null}
      {hint ? <p className="rounded bg-accent-soft px-3 py-2 text-sm text-accent">{hint}{app.channel === "web_form" ? " Reply in the thread you applied through, or the employer's portal." : ""}</p> : null}

      {job ? (
        <>
      {/* Pre-flight (DOC-01) */}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">1. Pre-flight</h2>
          <form action={preflightAction}><input type="hidden" {...hidden} /><button className={btn}>Check again</button></form>
        </div>
        {pf ? (
          <div className="mt-3 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <div className="space-y-2">
              <div>
                <span className="font-medium">Job status: </span>
                {pf.live === "open" ? <span className="text-good">open (confirmed {timeAgo(pf.checkedAt)})</span> : pf.live === "closed" ? <span className="text-bad">closed. Don&apos;t spend time on this one.</span> : <span className="text-muted">couldn&apos;t confirm; this source has no status check. Open the employer&apos;s page before you start.</span>}
              </div>
              <div>
                <span className="font-medium">How to apply: </span>
                {pf.applyEmail ? (
                  <>by email to <strong>{pf.applyEmail.email}</strong> <span className="text-xs text-muted">(&ldquo;{pf.applyEmail.quote}&rdquo;)</span>. Sending from your own email arrives in Phase 4; until then, attach the files below yourself.</>
                ) : (
                  <>through the employer&apos;s form. <a href={job.applyUrl} target="_blank" rel="noopener" className="text-accent underline">Open the employer&apos;s form</a>; you submit it yourself.</>
                )}
              </div>
              <div>
                <span className="font-medium">Cover letter: </span>
                {pf.letter === "required" ? "required by the form." : pf.letter === "optional" ? "optional on the form." : pf.letter === "asked" ? "the posting mentions one." : "not asked for. Send one only if it adds what your CV can't, like your location, time-zone overlap or how you can be hired (contractor or employer of record)."}
              </div>
              {pf.lever ? <div className="text-muted">Lever lists this job as {[pf.lever.workplaceType, pf.lever.country].filter(Boolean).join(", ") || "no workplace type"}.</div> : null}
              <div className="rounded border border-line p-3">
                <div className="font-medium">{AI_STANCE[pf.aiPolicy.stance][0]}</div>
                <div className="text-muted">{AI_STANCE[pf.aiPolicy.stance][1]}</div>
                {pf.aiPolicy.quote ? <div className="mt-1 text-xs text-muted">&ldquo;{pf.aiPolicy.quote}&rdquo;</div> : null}
              </div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">Knockout questions on the form</div>
              {pf.form.note ? <p className="text-muted">{pf.form.note}</p> : null}
              {pf.form.source && !pf.form.note && !knockouts.length ? <p className="text-muted">None found among {pf.form.fields.length} questions.</p> : null}
              {knockouts.length ? (
                <ul className="space-y-1">
                  {knockouts.map((q, i) => (
                    <li key={i} className="rounded bg-warn-soft px-3 py-1.5 text-warn">{q.label}{q.required ? " (required)" : ""}</li>
                  ))}
                </ul>
              ) : null}
              {knockouts.length ? <p className="text-xs text-muted">These decide automatic rejections. Answer them yourself and truthfully: from {profile?.data.country ?? "your country"}, a wrong &ldquo;yes&rdquo; can end the process later, or worse.</p> : null}
            </div>
            {pf.aiNotice.disclaimer || pf.aiNotice.optOutUrl ? (
              <div className="rounded border border-accent/40 bg-accent-soft p-3 md:col-span-2">
                <div className="font-medium text-accent">This employer may use AI to review applications</div>
                <p className="mt-1">{pf.aiNotice.disclaimer}</p>
                <p className="mt-1 text-muted">
                  You can ask for your application to be reviewed without AI. Greenhouse describes opting out as: a person reviews it with the employer&apos;s non-AI process, it applies to this application only, you can change your mind, and any AI score is deleted. Neither choice is the safe one by default, and JobHunter never opts out for you.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {pf.aiNotice.optOutUrl ? <a href={pf.aiNotice.optOutUrl} target="_blank" rel="noopener" className={btn}>Open the opt-out page</a> : null}
                  <form action={aiOptOutAction}><input type="hidden" {...hidden} /><input type="hidden" name="choice" value="opted_out" /><button className={btn}>I opted out</button></form>
                  <form action={aiOptOutAction}><input type="hidden" {...hidden} /><input type="hidden" name="choice" value="stayed_in" /><button className={btn}>I didn&apos;t opt out</button></form>
                  {app.aiOptOut ? <span className="text-xs text-muted">Logged: {app.aiOptOut === "opted_out" ? "you opted out" : "you didn't opt out"}</span> : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : <p className="mt-2 text-sm text-muted">Not checked yet.</p>}
      </section>

      {/* Evidence matrix (DOC-02) */}
      <section className={card}>
        <h2 className="font-medium">2. What they ask for, and your evidence</h2>
        <p className="mb-3 mt-1 text-sm text-muted">Hiring systems grade each requirement separately. Use the posting&apos;s terms only where your CV backs them up.</p>
        <EvidenceTable rows={app.evidence} />
      </section>

        </>
      ) : (
        <section className={card}>
          <h2 className="font-medium">1. Speculative application to {app.specCompany}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>The address must be published on {app.specCompany}&apos;s own site for jobs or CVs. JobHunter checks it&apos;s on the page you gave: {app.specSourceUrl ? <a href={app.specSourceUrl} target="_blank" rel="noopener" className="break-all text-accent underline">{app.specSourceUrl}</a> : "none"}.</li>
            <li>At most 3 speculative applications a day, and one per company every 90 days.</li>
            <li>One follow-up at most, after about 10 business days.</li>
            <li>Make each note specific to {app.specCompany}. Referrals beat cold contact, so if you know someone there, ask them first.</li>
          </ul>
        </section>
      )}

      {cv ? <DocSection doc={cv} title={job ? "3. Tailored CV" : "2. Your CV"} appId={app.id} extra={master ? <ChangeLogView entries={changeLog(parseCvDocText(cv.content), master, job?.requirements ?? null)} /> : null} /> : null}
      {letter ? <DocSection doc={letter} title={`4. Cover letter${pf?.letter === "not_asked" ? " (optional)" : ""}`} appId={app.id} /> : null}

      {app.channel === "email" || app.channel === "speculative" || pf?.applyEmail ? (
        <EmailSection applicationId={app.id} channel={app.channel} applied={!!app.appliedAt} title={job ? "6. Email your application" : "3. Email your application"} />
      ) : null}

      {/* Form answers (DOC-09) */}
      {questions.length ? (
        <section className={card}>
          <h2 className="font-medium">5. The employer&apos;s form</h2>
          <p className="mb-3 mt-1 text-sm text-muted">Only your contact details are pre-filled. Authorization, sponsorship, location, salary and diversity questions are always yours to answer.</p>
          <ul className="space-y-2 text-sm">
            {questions.map((q, i) => (
              <li key={i} className={`rounded border px-3 py-2 ${q.kind === "sensitive" ? "border-warn/40 bg-warn-soft" : "border-line"}`}>
                <div className="font-medium">{q.label}{q.required ? <span className="text-bad"> *</span> : null}</div>
                {q.prefill ? <div className="mt-0.5 font-mono text-xs">{q.prefill}</div> : null}
                {q.guidance ? <div className="text-xs text-muted">{q.guidance}</div> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className={card}>
          <h2 className="mb-2 font-medium">Before you apply: identity readiness</h2>
          {(() => {
            const items = master && profile?.otherProfile ? compareProfiles(master, profile.otherProfile) : null;
            const bad = items?.filter((i) => i.status === "mismatch" || i.status === "only_cv") ?? [];
            return (
              <div className={`mb-3 rounded px-3 py-2 text-sm ${!items ? "bg-bg" : bad.length ? "bg-warn-soft text-warn" : "bg-good-soft text-good"}`}>
                {!items ? <>Your CV hasn&apos;t been compared with your LinkedIn. </> : bad.length ? <>{bad.length} difference{bad.length > 1 ? "s" : ""} between your CV and LinkedIn ({bad.slice(0, 2).map((b) => b.label).join("; ")}). </> : <>Your CV and LinkedIn agree. </>}
                <Link href="/profile#consistency" className="underline">{items ? "See the check" : "Compare them"}</Link>
              </div>
            );
          })()}
          <IdentityChecklist />
        </section>
        <section className={card}>
          <h2 className="mb-2 font-medium">Notes</h2>
          <form action={notesAction} className="space-y-2">
            <input type="hidden" {...hidden} />
            <textarea name="notes" defaultValue={app.notes} rows={6} className="w-full rounded border border-line bg-bg p-2 text-sm" placeholder="Contacts, interview dates, what you sent…" />
            <button className={btn}>Save notes</button>
          </form>
          <h3 className="mb-1 mt-4 text-sm font-medium">History</h3>
          <ul className="max-h-48 space-y-0.5 overflow-auto text-xs text-muted">
            {events.map((e) => <li key={e.id}>{new Date(e.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}: {e.detail || e.kind}</li>)}
          </ul>
          <form action={deleteApplicationAction} className="mt-4">
            <input type="hidden" {...hidden} />
            <button className="text-xs text-bad underline">Delete this application and its documents</button>
          </form>
        </section>
      </div>
    </div>
  );
}

function DocSection({ doc, title, appId, extra }: { doc: DocRow; title: string; appId: number; extra?: ReactNode }) {
  const kind = doc.kind as "cv" | "letter";
  const problems = docProblems(doc);
  const approved = !!doc.approvedAt;
  const hidden = { name: "applicationId", value: appId };
  return (
    <section id={kind} className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{title} <span className="text-xs font-normal text-muted">v{doc.version}</span></h2>
        {approved ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-good">Approved {timeAgo(doc.approvedAt)}</span>
            <a href={`/api/applications/${appId}/${kind}.pdf`} className={primary}>Download PDF</a>
            <a href={`/api/applications/${appId}/${kind}.docx`} className={btn}>Download Word</a>
          </div>
        ) : (
          <form action={approveDocAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" {...hidden} /><input type="hidden" name="kind" value={kind} />
            {problems.length ? <span className="text-xs text-bad">{problems.length} thing{problems.length > 1 ? "s" : ""} to fix first</span> : null}
            <button className={primary} disabled={problems.length > 0}>I&apos;ve read it. Approve</button>
          </form>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <form action={saveDocAction} className="space-y-2">
          <input type="hidden" {...hidden} /><input type="hidden" name="kind" value={kind} />
          <textarea name="content" defaultValue={doc.content} rows={kind === "cv" ? 32 : 18} spellCheck className="w-full rounded border border-line bg-bg p-2 font-mono text-[13px] leading-relaxed sm:p-3" />
          <div className="flex flex-wrap gap-2">
            <button className={primary}>Save and check</button>
            <button formAction={regenerateDocAction} className={btn}>Rebuild from my CV</button>
          </div>
          <p className="text-xs text-muted">
            {kind === "cv"
              ? "Keep the layout: headings in capitals, one role per line as Title | Employer | Dates, bullets starting with \"- \". Editing resets approval."
              : "Replace every [bracketed] prompt with your own words. Editing resets approval."}
          </p>
        </form>
        <div className="space-y-4">
          {doc.checks ? <FlagList flags={doc.checks.flags} /> : null}
        </div>
      </div>
      {doc.checks ? <div className="mt-4"><ReadBackView checks={doc.checks} /></div> : null}
      {extra ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium">Change log: where every line came from</summary>
          <div className="mt-2">{extra}</div>
        </details>
      ) : null}
    </section>
  );
}
