"use client";

/**
 * `<HydrationBoundary>` for a server prefetch that a browser write has
 * outdated. The server's provider is seeded fresh per request and never sees a
 * browser write, so a page rendered after a save carries pre-save rows with a
 * newer `dataUpdatedAt` than the browser's own, and hydrating them would show
 * the old title. Once the browser has written, its provider is the source of
 * truth: the server state is dropped and the page reads from the browser.
 */

import {
  type DehydratedState,
  HydrationBoundary,
  type QueryClient,
  useQueryClient,
} from "@tanstack/react-query";
import { type ReactNode, useMemo } from "react";

const written = new WeakSet<QueryClient>();

/** Marks `queryClient` as written to once any of its mutations succeeds. */
export function watchWrites(queryClient: QueryClient): void {
  queryClient.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") {
      written.add(queryClient);
    }
  });
}

export function Prefetched({
  state,
  children,
}: {
  state: DehydratedState;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const current = useMemo<DehydratedState>(
    () => (written.has(queryClient) ? { ...state, queries: [] } : state),
    [state, queryClient],
  );
  return <HydrationBoundary state={current}>{children}</HydrationBoundary>;
}
