/**
 * W2-T6 — The documented loader → ensureQueryData → useQuery story AS A TEST
 * (plan D5 / §0b-5). This IS the canonical SSR data-flow example, executable so
 * it never rots:
 *
 *   1. A route LOADER prefetches into a per-request QueryClient via the P2
 *      option factory (`ensureQueryData(getListOptions(...))`) — blocking, so
 *      the data is present before render.
 *   2. The server DEHYDRATEs that client into the HTML.
 *   3. The browser HYDRATEs a fresh client (under `<HydrationBoundary>`), then
 *      the component reads the SAME option factory via `useQuery` → CACHE HIT,
 *      no client-side refetch.
 *
 * The test drives all three steps against a spy provider and asserts the
 * provider is called exactly ONCE (the loader), never again on the client.
 */

import type { DataProvider } from "@chelone/core";
import { fakeDataProvider, getListOptions } from "@chelone/core";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CheloneProvider } from "../context";
import { dehydrate, HydrationBoundary, hydrate } from "./hydration";

interface Post extends Record<string, unknown> {
  id: number;
  title: string;
}

/** The component reads the SAME option factory the loader used → cache hit. */
function PostList({ dp, client }: { dp: DataProvider; client: QueryClient }) {
  const { data } = useQuery(
    getListOptions({ dataProvider: dp, queryClient: client }, "posts", {
      pagination: { page: 1, perPage: 10 },
    }),
  );
  return <div>{data ? `total:${data.total}` : "loading"}</div>;
}

describe("loader → ensureQueryData → useQuery (SSR data flow)", () => {
  it("prefetches in the loader, hydrates, and the component reads the cache (no client refetch)", async () => {
    const getList = vi.fn(async () => ({
      data: [{ id: 1, title: "a" }] as Post[],
      total: 1,
    }));
    const dp = { ...fakeDataProvider({}), getList };
    const params = { pagination: { page: 1, perPage: 10 } };

    // 1. LOADER (server): prefetch into a per-request client.
    const serverClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await serverClient.ensureQueryData(
      getListOptions(
        { dataProvider: dp, queryClient: serverClient },
        "posts",
        params,
      ),
    );
    expect(getList).toHaveBeenCalledTimes(1);

    // 2. DEHYDRATE (server) → wire.
    const wire = JSON.parse(JSON.stringify(dehydrate(serverClient)));

    // 3. HYDRATE (browser): a fresh client, seeded via <HydrationBoundary>. The
    // component reads the same query → cache hit, so `getList` is NOT re-called.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    // Two hydration paths are both supported: imperative `hydrate` and the
    // declarative boundary. Use the boundary (the render-time idiom).
    render(
      <CheloneProvider dataProvider={dp} queryClient={client}>
        <HydrationBoundary state={wire}>
          <PostList dp={dp} client={client} />
        </HydrationBoundary>
      </CheloneProvider>,
    );

    // The component renders the cached total immediately (or next tick) without
    // a second provider call.
    expect(await screen.findByText("total:1")).toBeDefined();
    expect(getList).toHaveBeenCalledTimes(1);
    // Silence the unused-import lint for the imperative form (also exercised in
    // hydration.test.tsx) — reference it so the example shows both exist.
    expect(typeof hydrate).toBe("function");
  });
});
