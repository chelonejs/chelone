/**
 * Public SSR/server-entry seam for `@chelone/react` (P6 W2-T6). The query-cache
 * handoff (dehydrate/hydrate/HydrationBoundary, thin-wrapped from React Query)
 * plus the router factory (`createCheloneRouter`, a per-request data router built
 * outside the tree). NO server functions — that is post-v1 `@chelone/start`
 * (plan D5). The canonical loader → ensureQueryData → useQuery flow is executed
 * in `loader-example.test.tsx`.
 */

export type {
  DehydratedState,
  DehydrateOptions,
  HydrateOptions,
  HydrationBoundaryProps,
} from "./hydration";
export { dehydrate, HydrationBoundary, hydrate } from "./hydration";
export type {
  CheloneRouterHandle,
  CreateCheloneRouterOptions,
} from "./router-factory";
export { createCheloneRouter } from "./router-factory";
