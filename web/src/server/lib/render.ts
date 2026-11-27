import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { extractCvText, hiddenContent, parseCvText } from "./cv";
import { CV_HEADINGS, parseCvDocText, type CvDoc } from "./tailor";

/**
 * DOCX and text-based PDF from one source (DOC-04): single column, real text,
 * conventional headings, contact details in the body, black text at readable
 * sizes inside the margins. No tables, text boxes, icons, images or keywords
 * metadata. Then the read-back (DOC-05) extracts the text again, the way hiring
 * software does, and checks what came out.
 */

type Block =
  | { t: "name"; text: string }
  | { t: "contact"; text: string }
  | { t: "heading"; text: string }
  | { t: "role"; title: string; rest: string }
  | { t: "bullet"; text: string }
  | { t: "para"; text: string }
  | { t: "line"; text: string }
  | { t: "gap" };

function cvBlocks(d: CvDoc): Block[] {
  const b: Block[] = [{ t: "name", text: d.name }];
  if (d.contact.length) b.push({ t: "contact", text: d.contact.join(" · ") });
  const section = (h: string, body: Block[]) => { if (body.length) b.push({ t: "heading", text: h }, ...body); };
  section("SUMMARY", d.summary ? [{ t: "para", text: d.summary }] : []);
  section("SKILLS", d.skills.length ? [{ t: "para", text: d.skills.join(", ") }] : []);
  section("EXPERIENCE", d.experience.flatMap((r): Block[] => {
    const dates = r.start || r.end ? `${r.start ?? ""} – ${r.end ?? ""}`.trim() : null;
    const rest = [r.employer, dates].filter(Boolean).join(" | ");
    return [{ t: "role", title: r.title, rest: rest ? ` | ${rest}` : "" }, ...r.bullets.map((x): Block => ({ t: "bullet", text: x })), { t: "gap" }];
  }));
  section("EDUCATION", d.education.map((e): Block => ({ t: "para", text: e })));
  section("LANGUAGES", d.languages.length ? [{ t: "para", text: d.languages.join(", ") }] : []);
  return b;
}

function letterBlocks(text: string): Block[] {
  return text.replace(/\r/g, "").trim().split("\n").map((l): Block => (l.trim() ? { t: "line", text: l.trim() } : { t: "gap" }));
}

// ---------- DOCX ----------

async function toDocx(blocks: Block[], meta: { title: string; author: string }): Promise<Uint8Array> {
  const children: Paragraph[] = blocks.map((b) => {
    switch (b.t) {
      case "name": return new Paragraph({ children: [new TextRun({ text: b.text, bold: true, size: 32 })] });
      case "contact": return new Paragraph({ children: [new TextRun({ text: b.text, size: 20 })], spacing: { after: 160 } });
      case "heading": return new Paragraph({ text: b.text, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } });
      case "role": return new Paragraph({ children: [new TextRun({ text: b.title, bold: true }), new TextRun({ text: b.rest })], spacing: { before: 120 } });
      case "bullet": return new Paragraph({ text: b.text, bullet: { level: 0 } });
      case "para": return new Paragraph({ text: b.text, spacing: { after: 120 } });
      case "line": return new Paragraph({ text: b.text });
      case "gap": return new Paragraph({ text: "" });
    }
  });
  const doc = new Document({
    creator: meta.author,
    title: meta.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22, color: "000000" } }, heading2: { run: { font: "Calibri", size: 24, bold: true, color: "000000" } } } },
    sections: [{ properties: {}, children }],
  });
  return new Uint8Array(await Packer.toBuffer(doc));
}

// ---------- PDF ----------

/** WinAnsi-safe text for the standard PDF fonts; records every substitution. */
function safeText(font: PDFFont, s: string, subs: Set<string>, cache: Map<string, boolean>): string {
  const ok = (ch: string) => {
    if (!cache.has(ch)) {
      try { font.encodeText(ch); cache.set(ch, true); } catch { cache.set(ch, false); }
    }
    return cache.get(ch)!;
  };
  return [...s.normalize("NFC")].map((ch) => {
    if (ok(ch)) return ch;
    const base = ch.normalize("NFKD").replace(/[̀-ͯ]/g, "");
    const rep = base && [...base].every(ok) ? base : "?";
    subs.add(`${ch} → ${rep}`);
    return rep;
  }).join("");
}

async function toPdf(blocks: Block[], meta: { title: string; author: string }): Promise<{ bytes: Uint8Array; substitutions: string[] }> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(meta.title);
  pdf.setAuthor(meta.author);
  pdf.setCreator("JobHunter");
  pdf.setProducer("JobHunter");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const subs = new Set<string>();
  const cache = new Map<string, boolean>();
  const W = 595.28, H = 841.89, M = 54;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const black = rgb(0, 0, 0);

  const ensure = (h: number) => {
    if (y - h < M) { page = pdf.addPage([W, H]); y = H - M; }
  };
  const wrap = (text: string, font: PDFFont, size: number, width: number) => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (font.widthOfTextAtSize(next, size) <= width || !cur) cur = next;
      else { lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines;
  };
  const write = (text: string, font: PDFFont, size: number, opts: { indent?: number; after?: number; prefix?: string } = {}) => {
    const indent = opts.indent ?? 0;
    const lines = wrap(safeText(font, text, subs, cache), font, size, W - 2 * M - indent);
    lines.forEach((l, i) => {
      ensure(size * 1.35);
      y -= size * 1.35;
      if (i === 0 && opts.prefix) page.drawText(opts.prefix, { x: M + indent - 10, y, size, font: regular, color: black });
      page.drawText(l, { x: M + indent, y, size, font, color: black });
    });
    y -= opts.after ?? 0;
  };

  for (const b of blocks) {
    if (b.t === "name") write(b.text, bold, 18, { after: 2 });
    else if (b.t === "contact") write(b.text, regular, 10, { after: 8 });
    else if (b.t === "heading") { ensure(40); y -= 8; write(b.text, bold, 11.5, { after: 3 }); }
    else if (b.t === "role") {
      // Title in bold followed by the rest on the same line when it fits.
      const title = safeText(bold, b.title, subs, cache);
      const rest = safeText(regular, b.rest, subs, cache);
      const tw = bold.widthOfTextAtSize(title, 10.5);
      if (tw + regular.widthOfTextAtSize(rest, 10.5) <= W - 2 * M) {
        ensure(16); y -= 10.5 * 1.35 + 2;
        page.drawText(title, { x: M, y, size: 10.5, font: bold, color: black });
        if (rest) page.drawText(rest, { x: M + tw, y, size: 10.5, font: regular, color: black });
      } else write(`${b.title}${b.rest}`, bold, 10.5);
    } else if (b.t === "bullet") write(b.text, regular, 10.5, { indent: 12, prefix: "•" });
    else if (b.t === "para") write(b.text, regular, 10.5, { after: 4 });
    else if (b.t === "line") write(b.text, regular, 11);
    else y -= 8;
  }
  return { bytes: await pdf.save(), substitutions: [...subs] };
}

// ---------- public API ----------

export type Rendered = { pdf: Uint8Array; docx: Uint8Array; substitutions: string[] };

export async function renderCv(text: string): Promise<Rendered & { doc: CvDoc }> {
  const doc = parseCvDocText(text);
  const blocks = cvBlocks(doc);
  const meta = { title: `${doc.name} CV`, author: doc.name };
  const [pdf, docx] = await Promise.all([toPdf(blocks, meta), toDocx(blocks, meta)]);
  return { pdf: pdf.bytes, docx, substitutions: pdf.substitutions, doc };
}

export async function renderLetter(text: string, name: string): Promise<Rendered> {
  const blocks = letterBlocks(text);
  const meta = { title: `${name} cover letter`, author: name };
  const [pdf, docx] = await Promise.all([toPdf(blocks, meta), toDocx(blocks, meta)]);
  return { pdf: pdf.bytes, docx, substitutions: pdf.substitutions };
}

export type ReadCheck = { label: string; status: "pass" | "warn" | "fail"; detail?: string };
export type ReadBack = { format: "pdf" | "docx"; ok: boolean; checks: ReadCheck[]; text: string };

const flat = (s: string) => s.toLowerCase().replace(/[••]/g, " ").replace(/\s+/g, " ").trim();
const nm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

async function extract(bytes: Uint8Array, format: "pdf" | "docx") {
  // The PDF reader takes ownership of (detaches) the buffer it's given, so it gets a copy.
  return extractCvText({ name: `x.${format}`, type: "", bytes: bytes.slice() });
}

function commonChecks(text: string, sourceText: string, substitutions: string[], format: "pdf" | "docx"): ReadCheck[] {
  const checks: ReadCheck[] = [];
  const hidden = hiddenContent(text);
  checks.push(hidden.length ? { label: "No hidden content", status: "fail", detail: hidden.join("; ") } : { label: "No hidden content", status: "pass" });
  // Text in the file that isn't in what you approved (white text, off-page text, template leftovers).
  const src = new Set(flat(sourceText).split(" "));
  const extra = flat(text).split(" ").filter((w) => w && !src.has(w) && !/^[|–—-]$/.test(w));
  checks.push(extra.length > 3 ? { label: "Nothing extra in the file", status: "fail", detail: `Found text you didn't write: ${extra.slice(0, 8).join(" ")}` } : { label: "Nothing extra in the file", status: "pass" });
  if (format === "pdf" && substitutions.length) checks.push({ label: "All characters shown as typed", status: "warn", detail: `The PDF font can't show ${substitutions.join(", ")}. The Word file keeps them; if this is your name, send the Word file or check the PDF.` });
  return checks;
}

/** ATS read-back for a CV (DOC-05): reading order, sections, contact fields, titles and dates. */
export async function readBackCv(bytes: Uint8Array, format: "pdf" | "docx", doc: CvDoc, substitutions: string[] = []): Promise<ReadBack> {
  const checks: ReadCheck[] = [];
  let text = "";
  try { text = await extract(bytes, format); } catch (e) { checks.push({ label: "Text can be read", status: "fail", detail: String(e) }); }
  if (text.trim().length < 80) {
    checks.push({ label: "Text can be read", status: "fail", detail: "Little or no text came out of the file." });
    return { format, ok: false, checks, text };
  }
  checks.push({ label: "Text can be read", status: "pass" });
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  const parse = parseCvText(text);

  const nameOk = nm(lines[0]) === nm(doc.name) || (substitutions.length > 0 && nm(lines[0]).length === nm(doc.name).length);
  checks.push({ label: "Your name comes first", status: nameOk ? "pass" : "fail", detail: nameOk ? lines[0] : `First line read as "${lines[0] ?? ""}"` });

  const email = doc.contact.find((c) => c.includes("@"));
  if (email) checks.push({ label: "Email found", status: nm(parse.contact.email) === nm(email) ? "pass" : "fail", detail: parse.contact.email ?? "not found" });
  else checks.push({ label: "Email found", status: "fail", detail: "Your CV has no email address in the contact line." });
  const phone = doc.contact.find((c) => /\d[\d\s\-().]{7,}\d/.test(c) && !c.includes("@"));
  if (phone) {
    const digits = (s: string | null) => (s ?? "").replace(/\D/g, "");
    checks.push({ label: "Phone found", status: digits(parse.contact.phone) === digits(phone) ? "pass" : "warn", detail: parse.contact.phone ?? "not found" });
  }

  // Sections present and in the right order.
  const wanted = CV_HEADINGS.filter((h) => (h === "SUMMARY" ? doc.summary : h === "SKILLS" ? doc.skills.length : h === "EXPERIENCE" ? doc.experience.length : h === "EDUCATION" ? doc.education.length : doc.languages.length));
  const at = wanted.map((h) => lines.findIndex((l) => l.toUpperCase() === h));
  const missing = wanted.filter((_, i) => at[i] < 0);
  const ordered = at.every((v, i) => i === 0 || v > at[i - 1]);
  checks.push(missing.length ? { label: "Sections found in order", status: "fail", detail: `Missing: ${missing.join(", ")}` } : ordered ? { label: "Sections found in order", status: "pass", detail: wanted.join(" → ") } : { label: "Sections found in order", status: "fail", detail: "Sections came out in a different order" });

  // Roles: same titles, employers and dates, in the same order.
  const roleIssues: string[] = [];
  if (parse.roles.length !== doc.experience.length) roleIssues.push(`read ${parse.roles.length} roles, expected ${doc.experience.length}`);
  doc.experience.forEach((r, i) => {
    const p = parse.roles[i];
    if (!p) return;
    if (nm(p.title) !== nm(r.title)) roleIssues.push(`title "${p.title}" vs "${r.title}"`);
    if (nm(p.employer) !== nm(r.employer)) roleIssues.push(`employer "${p.employer ?? ""}" vs "${r.employer ?? ""}"`);
    if (nm(p.start) !== nm(r.start) || nm(p.end) !== nm(r.end)) roleIssues.push(`dates for ${r.title}`);
  });
  checks.push(roleIssues.length ? { label: "Job titles, employers and dates read correctly", status: "fail", detail: roleIssues.slice(0, 4).join("; ") } : { label: "Job titles, employers and dates read correctly", status: "pass", detail: `${doc.experience.length} roles` });

  const all = flat(text);
  const lost = doc.experience.flatMap((r) => r.bullets).filter((b) => !all.includes(flat(b)));
  checks.push(lost.length ? { label: "Every bullet is readable", status: format === "pdf" && substitutions.length ? "warn" : "fail", detail: `Not found: "${lost[0].slice(0, 80)}"` } : { label: "Every bullet is readable", status: "pass" });

  const source = [doc.name, doc.contact.join(" "), ...wanted, doc.summary, doc.skills.join(", "), ...doc.experience.flatMap((r) => [r.title, r.employer ?? "", r.start ?? "", r.end ?? "", ...r.bullets]), ...doc.education, doc.languages.join(", ")].join(" ");
  checks.push(...commonChecks(text, source, substitutions, format));
  return { format, ok: !checks.some((c) => c.status === "fail"), checks, text };
}

/** Read-back for a letter: all paragraphs present, nothing hidden or extra. */
export async function readBackLetter(bytes: Uint8Array, format: "pdf" | "docx", source: string, substitutions: string[] = []): Promise<ReadBack> {
  const checks: ReadCheck[] = [];
  let text = "";
  try { text = await extract(bytes, format); } catch (e) { checks.push({ label: "Text can be read", status: "fail", detail: String(e) }); }
  checks.push({ label: "Text can be read", status: text.trim().length > 40 ? "pass" : "fail" });
  const all = flat(text);
  const lost = source.split("\n").map((p) => p.trim()).filter(Boolean).filter((p) => !all.includes(flat(p)));
  checks.push(lost.length ? { label: "Every paragraph is readable", status: substitutions.length ? "warn" : "fail", detail: `Not found: "${lost[0].slice(0, 80)}"` } : { label: "Every paragraph is readable", status: "pass" });
  checks.push(...commonChecks(text, source, substitutions, format));
  return { format, ok: !checks.some((c) => c.status === "fail"), checks, text };
}
