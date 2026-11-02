import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOverpassProvider,
  OverpassError,
  type OverpassProvider,
  OverpassRateLimitError,
  OverpassTimeoutError,
  overpassQueryOptions,
} from "./overpass";

const ENDPOINT = "https://overpass.example.test/api/interpreter";

function stubFetch(body: unknown = { elements: [] }, init?: ResponseInit) {
  return vi.fn<typeof fetch>(
    async () => new Response(JSON.stringify(body), init),
  );
}

/** A fetch that never answers and rejects the way a real one does on abort. */
function hangingFetch() {
  return vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () =>
          reject(init.signal?.reason),
        );
      }),
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createOverpassProvider", () => {
  it("POSTs the encoded query as a form body", async () => {
    const fetchStub = stubFetch({ elements: [{ type: "way", id: 1 }] });
    const provider = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: fetchStub,
    });
    const query = '[out:json];way["natural"="water"](1,2,3,4);out geom;';
    const answer = await provider.query(query);

    expect(answer).toEqual({ elements: [{ type: "way", id: 1 }] });
    const [url, init] = fetchStub.mock.calls[0] ?? [];
    expect(url).toBe(ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/x-www-form-urlencoded",
    );
    expect(new URLSearchParams(String(init?.body)).get("data")).toBe(query);
    expect(String(init?.body)).not.toContain('"');
  });

  it("throws OverpassRateLimitError on 429 and OverpassTimeoutError on 504", async () => {
    const limited = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({}, { status: 429 }),
    });
    const error = await limited.query("q").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OverpassRateLimitError);
    expect(error).toBeInstanceOf(OverpassError);

    const gateway = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({}, { status: 504 }),
    });
    const timeout = await gateway.query("q").catch((e: unknown) => e);
    expect(timeout).toBeInstanceOf(OverpassTimeoutError);
    expect(timeout).toBeInstanceOf(OverpassError);
  });

  it("throws a plain OverpassError with the status for any other failure", async () => {
    const provider = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({}, { status: 400 }),
    });
    const error = await provider.query("q").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(OverpassError);
    expect(error).not.toBeInstanceOf(OverpassRateLimitError);
    expect(error).not.toBeInstanceOf(OverpassTimeoutError);
    expect((error as OverpassError).status).toBe(400);
  });

  it("rejects a 200 answer whose remark reports a server timeout or memory limit", async () => {
    const timedOut = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({
        elements: [{ type: "way", id: 1 }],
        remark:
          'runtime error: Query timed out in "query" at line 2 after 25 seconds.',
      }),
    });
    const timeout = await timedOut.query("q").catch((e: unknown) => e);
    expect(timeout).toBeInstanceOf(OverpassTimeoutError);

    const outOfMemory = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch({
        elements: [],
        remark: 'runtime error: Query ran out of memory in "query" at line 5.',
      }),
    });
    const memory = await outOfMemory.query("q").catch((e: unknown) => e);
    expect(memory).toBeInstanceOf(OverpassError);
    expect(memory).not.toBeInstanceOf(OverpassTimeoutError);
    expect((memory as OverpassError).message).toContain("out of memory");
  });

  it("resolves a 200 answer whose remark is not a runtime error", async () => {
    const answer = { elements: [], remark: "note: nothing to report" };
    const provider = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: stubFetch(answer),
    });
    expect(await provider.query("q")).toEqual(answer);
  });

  it("rejects with OverpassTimeoutError when the timeout fires even with a caller signal", async () => {
    vi.useFakeTimers();
    const provider = createOverpassProvider({
      endpoint: ENDPOINT,
      timeoutMs: 5000,
      fetch: hangingFetch(),
    });
    const caller = new AbortController();
    const pending = provider
      .query("q", { signal: caller.signal })
      .catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(4999);
    expect(caller.signal.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBeInstanceOf(OverpassTimeoutError);
  });

  it("times out after 30 seconds by default", async () => {
    vi.useFakeTimers();
    const provider = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: hangingFetch(),
    });
    const pending = provider.query("q").catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(29_999);
    let settled = false;
    pending.then(() => {
      settled = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBeInstanceOf(OverpassTimeoutError);
  });

  it("rejects with the caller's abort reason, not a timeout, when the caller aborts", async () => {
    const provider = createOverpassProvider({
      endpoint: ENDPOINT,
      fetch: hangingFetch(),
    });
    const caller = new AbortController();
    const pending = provider
      .query("q", { signal: caller.signal })
      .catch((e: unknown) => e);
    caller.abort();
    const error = await pending;
    expect(error).not.toBeInstanceOf(OverpassTimeoutError);
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("throws a TypeError without an endpoint", () => {
    expect(() => createOverpassProvider({} as { endpoint: string })).toThrow(
      TypeError,
    );
    expect(() => createOverpassProvider({ endpoint: "  " })).toThrow(
      '"endpoint"',
    );
  });
});

describe("overpassQueryOptions", () => {
  const provider = createOverpassProvider({
    endpoint: ENDPOINT,
    fetch: stubFetch(),
  });

  it("keys a provider without a cacheKey by its name", () => {
    const custom: OverpassProvider = {
      name: "acme",
      query: async () => ({}),
    };
    expect(overpassQueryOptions(custom, "out;").queryKey).toEqual([
      "overpass",
      "acme",
      "out;",
    ]);
    expect(
      overpassQueryOptions({ ...custom, cacheKey: "acme|eu" }, "out;").queryKey,
    ).toEqual(["overpass", "acme|eu", "out;"]);
  });

  it("two Overpass endpoints do not share a key", () => {
    const other = createOverpassProvider({
      endpoint: "https://other.example.test/api/interpreter",
      fetch: stubFetch(),
    });
    expect(overpassQueryOptions(provider, "out;").queryKey).not.toEqual(
      overpassQueryOptions(other, "out;").queryKey,
    );
  });

  it("is disabled for an empty query", () => {
    const options = overpassQueryOptions(provider, "out;");
    expect(options.queryKey).toContain("out;");
    expect(options.enabled).toBe(true);
    expect(options.staleTime).toBe(60 * 60 * 1000);
    expect(overpassQueryOptions(provider, "").enabled).toBe(false);
    expect(overpassQueryOptions(provider, "  ").enabled).toBe(false);
  });

  it("passes the query signal to the provider", async () => {
    const fetchStub = stubFetch({ elements: [] });
    const options = overpassQueryOptions(
      createOverpassProvider({ endpoint: ENDPOINT, fetch: fetchStub }),
      "out;",
      { staleTime: 10 },
    );
    expect(options.staleTime).toBe(10);
    const controller = new AbortController();
    await options.queryFn({ signal: controller.signal });
    controller.abort();
    expect(fetchStub).toHaveBeenCalledOnce();
    expect(fetchStub.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
