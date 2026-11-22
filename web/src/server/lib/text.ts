import sanitize from "sanitize-html";

const ENTITIES: Record<string, string> = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&amp;": "&",
};

/** Greenhouse returns HTML escaped as entities; undo one level. */
export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(lt|gt|quot|#39|apos|nbsp|amp);/g, (m) => ENTITIES[m] ?? m);
}

/** Safe subset of HTML for display. Links open in a new tab and never carry referrers. */
export function cleanHtml(html: string): string {
  return sanitize(html, {
    allowedTags: ["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "a", "blockquote"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      h1: "h3",
      a: sanitize.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
    },
    exclusiveFilter: (frame) => ["p", "li"].includes(frame.tag) && !frame.text.trim(),
  });
}

/** Plain text with paragraph breaks preserved (used for parsing and search). */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol|section)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ");
  const text = decodeEntities(sanitize(withBreaks, { allowedTags: [], allowedAttributes: {} }));
  return text
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

/** Split into sentence-like chunks for evidence quotes. */
export function sentences(text: string): string[] {
  return text
    // Don't split after initials ("U.S.") or common abbreviations ("Inc.", "e.g.").
    .split(/(?<=[.!?])(?<!\b[A-Z]\.)(?<!\b(?:Inc|Ltd|Co|Corp|Sr|Jr|Dr|Mr|Ms|Mrs|St|vs|etc|approx|e\.g|i\.e)\.)\s+(?=[A-Z0-9"“(])|\n+|•/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3 && s.length < 600);
}

/** Up to `max` chars around a regex match, on sentence boundaries where possible. */
export function quoteAround(text: string, index: number, length: number, max = 220): string {
  const sents = sentences(text);
  let pos = 0;
  for (const s of sents) {
    const at = text.indexOf(s, pos);
    if (at >= 0) {
      pos = at + s.length;
      if (index >= at && index < at + s.length + 1) return s.length > max ? s.slice(0, max - 1) + "…" : s;
    }
  }
  const start = Math.max(0, index - 80);
  return text.slice(start, Math.min(text.length, index + length + 80)).trim();
}
