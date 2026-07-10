/**
 * `useRefresh` / `useLoading` — the Vue twins of `@chelone/react`'s
 * `compat-hooks.ts` (`useRefresh` / `useLoading`). Both wrap
 * `@tanstack/vue-query` against the SAME `queryClient` `<Admin>` provides.
 * `<RefreshButton>` is the consumer: it invalidates every query on click and
 * disables while any request is in flight.
 */

import {
  useIsFetching,
  useIsMutating,
  useQueryClient,
} from "@tanstack/vue-query";
import { type ComputedRef, computed } from "vue";

/**
 * Trigger a full refresh (ra `useRefresh` parity). The returned callback
 * invalidates EVERY query (no filter) so the active ones refetch. Stable — the
 * `queryClient` identity never changes within an `<Admin>`.
 */
export function useRefresh(): () => void {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries();
  };
}

/**
 * Global data-connection state (ra `useLoading` parity): `true` while ANY query
 * or mutation is pending. The Vue twin needs no manual cache subscription — the
 * `useIsFetching` / `useIsMutating` composables already return reactive refs
 * over the two caches; this just ORs their counts into a boolean.
 */
export function useLoading(): ComputedRef<boolean> {
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  return computed(() => isFetching.value > 0 || isMutating.value > 0);
}
