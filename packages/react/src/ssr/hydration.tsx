/**
 * The SSR query-cache handoff (plan D5 / §0b-5). Chelone's SSR seam is NOT
 * server functions (that is post-v1 `@chelone/start`) — it is the React Query
 * dehydrate/hydrate cycle, thin-wrapped here so consumers import the SSR story
 * from `@chelone/react` (one place) rather than reaching into
 * `@tanstack/react-query` directly.
 *
 * The flow these three enable (executed in `loader-example.test.tsx`):
 *   1. A route LOADER prefetches into a per-request QueryClient via a P2 option
 *      factory: `ensureQueryData(getListOptions(ctx, "posts", params))`.
 *   2. The server `dehydrate`s that client → embeds the state in the HTML.
 *   3. The browser `hydrate`s a fresh client (imperatively, or declaratively via
 *      `<HydrationBoundary state={...}>`) so the first `useQuery` is a CACHE HIT.
 *
 * These are re-exports (not re-implementations): React Query already owns the
 * exact serialize/restore semantics, and re-implementing would only risk drift.
 */

export type {
  DehydratedState,
  DehydrateOptions,
  HydrateOptions,
  HydrationBoundaryProps,
} from "@tanstack/react-query";
export {
  dehydrate,
  HydrationBoundary,
  hydrate,
} from "@tanstack/react-query";
