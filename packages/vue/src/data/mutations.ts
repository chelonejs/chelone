/**
 * Data-mutation composables over `@tanstack/vue-query` — the Vue twin of the
 * mutation half of `@chelone/react`'s `hooks.ts` (`useUpdate`). Wraps core's
 * framework-agnostic `updateMutationOptions` (`mutationFn` + cache invalidation)
 * and hands it to vue-query's `useMutation`, reusing the SAME `dataProvider` +
 * `queryClient` `<Admin>` provides. `<ApiKeyInput>` is the first consumer: it is
 * NOT form-bound — it reads the ambient record/resource and dispatches this
 * mutation directly to trigger a server-side key rotation.
 */

import {
  type MutationModeOptions,
  type ResourceMap,
  updateMutationOptions,
} from "@chelone/core";
import { useMutation } from "@tanstack/vue-query";
import { useCheloneContext } from "../context";

/**
 * Update-one mutation for `resource`. Returns vue-query's mutation object; call
 * `.mutateAsync({ id, data, previousData })` to dispatch. Mirrors the React
 * `useUpdate(resource)` — `updateMutationOptions` binds the resource at call
 * time and invalidates that resource's caches on settle.
 */
export function useUpdate<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(resource: TName, options: MutationModeOptions = {}) {
  const ctx = useCheloneContext<TResources>();
  return useMutation(updateMutationOptions(ctx, resource, options));
}
