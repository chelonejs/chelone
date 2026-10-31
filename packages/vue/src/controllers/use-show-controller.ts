/**
 * `useShowController` — the Vue bridge for the vanilla core show controller, the
 * twin of `@chelone/react`'s `useShowController` (`controller-hooks.ts`). It
 * fetches ONE record (a `getOne` `QueryObserver` over `ctx.queryClient`) and
 * exposes it read-only — a show page never mutates, so (unlike
 * {@link useEditController}) there is no `save`/`saving`.
 *
 * The seam is identical to {@link useEditController}: the controller owns the
 * vanilla `query-core` observer over the vue-query `QueryClient` `<Admin>`
 * provides; `useMicroStore` is the single subscribe bridge (4R acquire on mount,
 * release on scope disposal).
 *
 * The record `id` defaults to the ambient `:id` route param (read through the
 * router adapter) when not passed — mirroring how the React `<Show>` view reads
 * `useParams().id`. Pass `id` explicitly to target a record without a router.
 */

import {
  createShowController,
  type Identifier,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
  type ShowController,
  type ShowControllerOptions,
  type ShowControllerState,
} from "@chelone/core";
import { computed, reactive } from "vue";
import { useCheloneContext } from "../context";
import { useRequiredResource } from "../resource-context";
import { useRouterAdapterOptional } from "../router/adapter";
import { useMicroStore } from "../store/use-micro-store";
import { toControllerContext } from "./controller-context";

/** Options for {@link useShowController}: the core show options (id optional) + a resource override. */
export interface UseShowControllerOptions
  extends Partial<ShowControllerOptions> {
  /** Target a specific resource; defaults to the ambient `<Resource>` name. */
  resource?: string;
}

/** The reactive result: the show-controller state (unwrapped, live). */
export type UseShowControllerReturn<TRecord> = ShowControllerState<TRecord> &
  Omit<ShowController<TRecord>, keyof MicroStore<ShowControllerState<TRecord>>>;

/** Resolve the record id: an explicit option wins, else the ambient `:id` route param. */
function resolveId(explicit: Identifier | undefined): Identifier {
  if (explicit !== undefined) return explicit;
  const adapter = useRouterAdapterOptional();
  const id = adapter?.useParams().value.id;
  if (id === undefined) {
    throw new Error(
      "useShowController: no `id` option and no `:id` route param — pass an id or render under a show route.",
    );
  }
  return id;
}

export function useShowController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseShowControllerOptions = {},
): UseShowControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const resource = useRequiredResource("useShowController", options) as TName;
  const id = resolveId(options.id);

  const controller: ShowController<TRecord> = createShowController(
    toControllerContext(ctx),
    resource,
    { ...options, id },
  );

  const state = useMicroStore(controller);

  return reactive({
    record: computed(() => state.value.record),
    isPending: computed(() => state.value.isPending),
    isFetching: computed(() => state.value.isFetching),
    error: computed(() => state.value.error),
  }) as UseShowControllerReturn<TRecord>;
}
