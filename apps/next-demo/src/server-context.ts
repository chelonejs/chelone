/**
 * What a server component reads and prefetches into. React's `cache()` scopes
 * one `QueryClient` and one `fakeDataProvider` (which clones its seed) to the
 * request, so two requests never share a cache, and the layout's and page's
 * prefetches in one request land in the same client.
 *
 * The browser's provider in `admin-shell.tsx` is seeded the same way, so the
 * prefetch and the client agree until a write: this provider is not the one a
 * write reaches.
 */

import {
  type DataContext,
  fakeDataProvider,
  getListOptions,
  getOneOptions,
  listFetchParams,
} from "@chelone/core";
import { seedData } from "@chelone/demo-data";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import type { NextDemoResources } from "./resources";

export const serverContext = cache(
  (): DataContext<NextDemoResources> => ({
    queryClient: new QueryClient(),
    dataProvider: fakeDataProvider<NextDemoResources>(seedData()),
  }),
);

/**
 * Prefetches a list under the query key the mounted `<List>` reads:
 * `listFetchParams` is the exact `getList` params a list controller starts
 * with, given the URL's query string, so the client's first read is a hit.
 */
export async function prefetchList<
  TName extends keyof NextDemoResources & string,
>(resource: TName, search: string) {
  const context = serverContext();
  await context.queryClient.ensureQueryData(
    getListOptions(
      context,
      resource,
      listFetchParams(context, resource, {}, search),
    ),
  );
  return dehydrate(context.queryClient);
}

/** Prefetches one record under the `oneKey` `<Edit>` reads it from. */
export async function prefetchOne<
  TName extends keyof NextDemoResources & string,
>(resource: TName, id: string | number) {
  const context = serverContext();
  await context.queryClient.ensureQueryData(
    getOneOptions(context, resource, { id }),
  );
  return dehydrate(context.queryClient);
}
