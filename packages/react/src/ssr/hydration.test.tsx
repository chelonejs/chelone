/**
 * W2-T6 — SSR/server-entry seam: dehydrate / hydrate round-trip.
 *
 * The seam Chelone offers for SSR is NOT server functions (that is post-v1
 * `@chelone/start`). It is the query-cache handoff (plan D5 / §0b-5): a server
 * loader prefetches into a QueryClient via the P2 option factories, that client
 * is `dehydrate`-d into the HTML, and the browser `hydrate`s a FRESH client from
 * it so the first `useQuery` is a CACHE HIT (no client refetch).
 *
 * These tests pin the round-trip and, crucially, the cache-hit: after hydrating,
 * reading the same option-factory query resolves from the cache WITHOUT calling
 * the data provider again.
 */

import type { DataProvider } from "@chelone/core";
import { fakeDataProvider, getListOptions } from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { dehydrate, hydrate } from "./hydration";

interface Post extends Record<string, unknown> {
  id: number;
  title: string;
}

function makeCtx(dp: DataProvider) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return { dataProvider: dp, queryClient };
}

describe("hydration — dehydrate/hydrate round-trip", () => {
  it("re-exports dehydrate/hydrate as functions", () => {
    expect(typeof dehydrate).toBe("function");
    expect(typeof hydrate).toBe("function");
  });

  it("dehydrates a client after a getList and hydrates it into a fresh client", async () => {
    const dp = fakeDataProvider({
      posts: [
        { id: 1, title: "a" },
        { id: 2, title: "b" },
      ],
    }) as DataProvider;
    const server = makeCtx(dp);
    const options = getListOptions(server, "posts", {
      pagination: { page: 1, perPage: 10 },
    });

    // Server: prefetch into the server client (the loader seam).
    await server.queryClient.ensureQueryData(options);

    // Dehydrate → serialize → this is what would be embedded in the HTML.
    const dehydrated = dehydrate(server.queryClient);
    const wire = JSON.parse(JSON.stringify(dehydrated));

    // Client: hydrate a FRESH client from the wire state.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    hydrate(client, wire);

    const cached = client.getQueryData(options.queryKey) as {
      data: Post[];
      total: number;
    };
    expect(cached.total).toBe(2);
    expect(cached.data.map((p) => p.title)).toEqual(["a", "b"]);
  });

  it("a hydrated cache serves the option-factory query WITHOUT refetching (cache hit)", async () => {
    const getList = vi.fn(async () => ({
      data: [{ id: 1, title: "a" }] as Post[],
      total: 1,
    }));
    const dp = { ...fakeDataProvider({}), getList };

    // Server prefetch (one provider call).
    const server = makeCtx(dp);
    const params = { pagination: { page: 1, perPage: 10 } };
    await server.queryClient.ensureQueryData(
      getListOptions(server, "posts", params),
    );
    expect(getList).toHaveBeenCalledTimes(1);

    // Round-trip the cache to a fresh client.
    const wire = JSON.parse(JSON.stringify(dehydrate(server.queryClient)));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    hydrate(client, wire);

    // Client-side read via the SAME option factory: the provider is NOT called
    // again — the hydrated entry satisfies it (cache hit).
    const clientCtx = { dataProvider: dp, queryClient: client };
    const result = await client.ensureQueryData(
      getListOptions(clientCtx, "posts", params),
    );
    expect(result.total).toBe(1);
    expect(getList).toHaveBeenCalledTimes(1); // still 1 — no client refetch.
  });
});
