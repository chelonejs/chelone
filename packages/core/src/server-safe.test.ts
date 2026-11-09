// @vitest-environment node
/**
 * Server-safety pin for the `@chelone/core` entry.
 *
 * A route loader, server function or server component imports `@chelone/core`
 * and a data provider straight into node. A module that reads a DOM global at
 * module scope breaks that import for the app, so the read has to fail here
 * instead: the node environment has no `window`, `document`, `localStorage` or
 * `sessionStorage`, and the barrel is loaded into a fresh module graph, so
 * import-time code really runs.
 *
 * `navigator` is not asserted on — Node 21 and later define it, so a
 * module-scope read of it would pass here and still break a server without it.
 */

import { dehydrate, QueryClient } from "@tanstack/query-core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

/** The barrel, re-imported through a reset module graph. */
const loadCore = () => {
  vi.resetModules();
  return import("./index");
};

describe("@chelone/core on a server", () => {
  it("imports the barrel with no DOM globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    expect(typeof localStorage).toBe("undefined");
    expect(typeof sessionStorage).toBe("undefined");

    const core = await loadCore();
    expect(core.fakeDataProvider).toBeTypeOf("function");
    expect(core.getListOptions).toBeTypeOf("function");
    expect(core.hasPendingUndoables).toBeTypeOf("function");
  });

  it("a server read path leaves the undoable state untouched", async () => {
    const core = await loadCore();
    // `hasUnsettledUndoables` is core-internal (the live-update hold reads it),
    // so it is read off the module the barrel just loaded, not off the barrel.
    const undoable = await import("./data/undoable");
    const resources = core.defineResources({
      posts: { schema: z.object({ id: z.number(), title: z.string() }) },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const ctx = {
      dataProvider: core.fakeDataProvider<typeof resources>({
        posts: [
          { id: 1, title: "a" },
          { id: 2, title: "b" },
        ],
      }),
      queryClient,
    };

    const list = await queryClient.fetchQuery(
      core.getListOptions(ctx, "posts", {}),
    );
    const record = await queryClient.fetchQuery(
      core.getOneOptions(ctx, "posts", { id: 1 }),
    );
    const dehydrated = dehydrate(queryClient);

    expect(list.data.map((post) => post.title)).toEqual(["a", "b"]);
    expect(record.title).toBe("a");
    // The list plus the two records `getListOptions` seeded for it.
    expect(dehydrated.queries.map((query) => query.queryKey)).toEqual([
      core.listKey("posts", {}),
      core.oneKey("posts", { id: 1 }),
      core.oneKey("posts", { id: 2 }),
    ]);
    expect(core.hasPendingUndoables()).toBe(false);
    expect(undoable.hasUnsettledUndoables()).toBe(false);
  });
});
