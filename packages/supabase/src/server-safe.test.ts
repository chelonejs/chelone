// @vitest-environment node
/**
 * Server-safety pin for the `@chelone/supabase` entry.
 *
 * A route loader or server function can build a Supabase data provider and read
 * a resource from node. A module that reads a DOM global at module scope breaks
 * that import for the app, so the read has to fail here instead: the node
 * environment has no `window`, `document`, `localStorage` or `sessionStorage`,
 * and the entry is loaded into a fresh module graph, so import-time code really
 * runs. Nothing is imported statically, so such a read fails inside the test
 * rather than before it.
 *
 * `navigator` is not asserted on — Node 21 and later define it, so a
 * module-scope read of it would pass here and still break a server without it.
 *
 * `readSupabaseUrlParams` keeps its `window.location` default: node never
 * evaluates it, because a default parameter is read when the function is called
 * without an argument, not when its module is imported.
 */

import { describe, expect, it, vi } from "vitest";

/** The entry, re-imported through a reset module graph. */
const loadEntry = () => {
  vi.resetModules();
  return import("./index");
};

describe("@chelone/supabase on a server", () => {
  it("imports the entry with no DOM globals", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    expect(typeof localStorage).toBe("undefined");
    expect(typeof sessionStorage).toBe("undefined");

    const entry = await loadEntry();
    expect(entry.supabaseDataProvider).toBeTypeOf("function");
    expect(entry.supabaseAuthProvider).toBeTypeOf("function");
    expect(entry.supabaseRealtimeTransport).toBeTypeOf("function");
    expect(entry.supabaseLockProvider).toBeTypeOf("function");
  });

  it("reads url params from a passed location, not from window", async () => {
    // The entry's only `window` is this default, reached at call time.
    const entry = await loadEntry();
    expect(
      entry.readSupabaseUrlParams({ search: "?access_token=at", hash: "#/cb" }),
    ).toMatchObject({ accessToken: "at" });
  });
});
