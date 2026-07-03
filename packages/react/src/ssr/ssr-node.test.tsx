// @vitest-environment node
/**
 * W2-T6 — SSR seam: node-importability + serializability audit (pure node, NO
 * jsdom).
 *
 * The `@vitest-environment node` pragma removes `window`/`document`, so any
 * `window`-at-import in the SSR barrel throws here — the strongest check that
 * the SSR helpers are server-safe. Also asserts the option-factory params /
 * results the loader hands the wire are JSON-serializable (the §0b-6a
 * DataProvider-serializability constraint), which is what makes dehydrate/hydrate
 * viable at all.
 */

import { fakeDataProvider, getListOptions } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import * as ssr from "./index";

describe("SSR barrel — node-importable (no window-at-import)", () => {
  it("has no window/document global (guards the premise)", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("exports the SSR helpers as callable symbols", () => {
    expect(typeof ssr.dehydrate).toBe("function");
    expect(typeof ssr.hydrate).toBe("function");
    expect(typeof ssr.HydrationBoundary).toBe("function");
    expect(typeof ssr.createCheloneRouter).toBe("function");
  });

  it("the dehydrated state after a getList is JSON-serializable (serializable DP results)", async () => {
    const dp = fakeDataProvider({
      posts: [{ id: 1, title: "a" }],
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await queryClient.ensureQueryData(
      getListOptions({ dataProvider: dp, queryClient }, "posts", {}),
    );
    const dehydrated = ssr.dehydrate(queryClient);
    // Round-trips through JSON with no loss — the DehydratedState is wire-safe.
    expect(() => JSON.stringify(dehydrated)).not.toThrow();
    const wire = JSON.parse(JSON.stringify(dehydrated));
    // The list query is dehydrated (plus a seeded per-record `oneKey` entry —
    // `getListOptions` pre-warms record detail via `setQueryData`), so at least
    // the list query is on the wire and every entry survives the JSON round-trip.
    expect(wire.queries.length).toBeGreaterThanOrEqual(1);
    const listQuery = wire.queries.find(
      (q: { queryKey: unknown[] }) =>
        q.queryKey[0] === "posts" && q.queryKey[1] === "getList",
    );
    expect(listQuery).toBeDefined();
  });
});
