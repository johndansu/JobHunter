import { approvedFile } from "@/server/applications";

const FILES: Record<string, { kind: "cv" | "letter"; format: "pdf" | "docx" }> = {
  "cv.pdf": { kind: "cv", format: "pdf" },
  "cv.docx": { kind: "cv", format: "docx" },
  "letter.pdf": { kind: "letter", format: "pdf" },
  "letter.docx": { kind: "letter", format: "docx" },
};

/** Download an approved document (DOC-04). Unapproved or changed text is never served. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await ctx.params;
  const f = FILES[file];
  if (!f || !(Number(id) > 0)) return new Response("Not found", { status: 404 });
  const r = await approvedFile(Number(id), f.kind, f.format);
  if ("error" in r) return new Response(r.error, { status: r.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(Buffer.from(r.bytes), {
    headers: {
      "Content-Type": r.type,
      "Content-Disposition": `attachment; filename="${r.fileName.replace(/[^\w.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(r.fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
