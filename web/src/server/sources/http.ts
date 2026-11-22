import type { FetchContext } from "./types";

const UA = process.env.USER_AGENT || "JobHunter/2.0";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class HttpError extends Error {
  constructor(public status: number, url: string) {
    super(`HTTP ${status} for ${url}`);
  }
}

/**
 * GET JSON/text politely: generic User-Agent (no personal details), backoff on 429,
 * retries on network errors and 5xx. A 404/410 is returned to the caller as an
 * HttpError so it can decide; timeouts and 5xx never count as "job closed" (REC-02).
 */
export async function getJson<T>(ctx: FetchContext, url: string, init: RequestInit = {}, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    ctx.stats.requests++;
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": UA, Accept: "application/json", ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 429) {
        const wait = Math.min(120, Number(res.headers.get("retry-after")) || 15 * (attempt + 1));
        ctx.log(`429 from ${new URL(url).host}, waiting ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }
      if (res.status >= 500) {
        lastErr = new HttpError(res.status, url);
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new HttpError(res.status, url);
      return (await res.json()) as T;
    } catch (e) {
      if (e instanceof HttpError && e.status < 500) throw e;
      lastErr = e;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export { sleep };
