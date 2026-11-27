import { afterEach, describe, expect, it, vi } from "vitest";
import { eachBoard } from "./ats";
import { himalayas, jobicy } from "./feeds";
import { HttpError } from "./http";

// REC-02: a job closes only on confirmed evidence. Timeouts, 429s and 5xx never close it.
const ctx = () => ({ log: () => {}, country: "NG", stats: { requests: 0 } });
const res = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => vi.unstubAllGlobals());

describe("closure rules", () => {
  it("a board that errors yields no batch, so closure-by-absence never runs for it", async () => {
    const batches = [];
    for await (const b of eachBoard(ctx(), [{ token: "down", name: "Down Inc" }, { token: "ok", name: "OK Inc" }], async (b) => {
      if (b.token === "down") throw new HttpError(503, "https://example.test");
      return { postings: [], skipped: 0 };
    })) batches.push(b);
    expect(batches.map((b) => b.board)).toEqual(["ok"]);
    expect(batches[0].complete).toBe(true);
  });

  it("Himalayas status check closes only on 410/404", async () => {
    const byPath: Record<string, number> = { a: 410, b: 503, c: 429, d: 200 };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => res(byPath[url.split("/").pop()!] ?? 404)));
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 2000 });
    const list = ["a", "b", "d", "c"].map((s) => ({ sourceJobId: s, url: `https://himalayas.app/companies/x/jobs/${s}` }));
    const closed = await himalayas.closeCheck!(ctx(), list);
    vi.useRealTimers();
    expect(closed).toEqual(["a"]);
  }, 30_000);

  it("Jobicy status check closes only jobs the source reports closed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(200, { jobs: [{ id: 1, status: "closed" }, { id: 2, status: "active" }, { id: 3, status: "unknown" }] })));
    const closed = await jobicy.closeCheck!(ctx(), [1, 2, 3].map((i) => ({ sourceJobId: String(i), url: "" })));
    expect(closed).toEqual(["1"]);
  }, 30_000);

  it("Jobicy status check that fails closes nothing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => res(503)));
    vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 5000 });
    const closed = await jobicy.closeCheck!(ctx(), [{ sourceJobId: "9", url: "" }]);
    vi.useRealTimers();
    expect(closed).toEqual([]);
  }, 60_000);
});
