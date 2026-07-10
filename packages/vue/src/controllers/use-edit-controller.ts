/**
 * `useEditController` — the Vue bridge for the vanilla core edit controller, the
 * twin of `@chelone/react`'s `useEditController` (`controller-hooks.ts`). It
 * fetches ONE record (a `getOne` `QueryObserver` over `ctx.queryClient`) and
 * exposes a `save` that persists through the core update mutation.
 *
 * The seam is identical to {@link useListController}: the controller owns the
 * vanilla `query-core` observers over the vue-query `QueryClient` `<Admin>`
 * provides; `useStore` is the single subscribe bridge (4R acquire on mount,
 * release on scope disposal). `save` is the controller's own `save` — at this
 * layer it is the raw core save pipeline (validate → persist → notify, resolving
 * server field errors); the FORM reconciliation (`form.reset(saved)`, field-
 * error mapping) is layered on top in the form composables (Task 6), exactly as
 * the React twin keeps `controller-hooks` thin and composes the form in
 * `form-hooks`.
 *
 * The record `id` defaults to the ambient `:id` route param (read through the
 * router adapter) when not passed — mirroring how the React `<Edit>` view reads
 * `useParams().id`. Pass `id` explicitly to target a record without a router.
 */

import {
  createEditController,
  type EditController,
  type EditControllerOptions,
  type EditControllerState,
  type Identifier,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
} from "@chelone/core";
import { computed, reactive } from "vue";
import { useCheloneContext } from "../context";
import { useRequiredResource } from "../resource-context";
import { useRouterAdapterOptional } from "../router/adapter";
import { useStore } from "../store/use-store";
import { toControllerContext } from "./controller-context";

/** Options for {@link useEditController}: the core edit options (id optional) + a resource override. */
export interface UseEditControllerOptions<TRecord>
  extends Partial<EditControllerOptions<TRecord>> {
  /** Target a specific resource; defaults to the ambient `<Resource>` name. */
  resource?: string;
}

/** The reactive result: the edit-controller state (unwrapped, live) plus the stable `save`. */
export type UseEditControllerReturn<TRecord> = EditControllerState<TRecord> &
  Omit<EditController<TRecord>, keyof MicroStore<EditControllerState<TRecord>>>;

/** Resolve the record id: an explicit option wins, else the ambient `:id` route param. */
function resolveId(explicit: Identifier | undefined): Identifier {
  if (explicit !== undefined) return explicit;
  const adapter = useRouterAdapterOptional();
  const id = adapter?.useParams().value.id;
  if (id === undefined) {
    throw new Error(
      "useEditController: no `id` option and no `:id` route param — pass an id or render under an edit route.",
    );
  }
  return id;
}

export function useEditController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseEditControllerOptions<RecordOf<TResources, TName>> = {},
): UseEditControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const resource = useRequiredResource("useEditController", options) as TName;
  const id = resolveId(options.id);

  const controller: EditController<TRecord> = createEditController(
    toControllerContext(ctx),
    resource,
    { ...options, id },
  );

  const state = useStore(controller);

  return reactive({
    record: computed(() => state.value.record),
    isPending: computed(() => state.value.isPending),
    isFetching: computed(() => state.value.isFetching),
    error: computed(() => state.value.error),
    saving: computed(() => state.value.saving),
    save: controller.save,
  }) as UseEditControllerReturn<TRecord>;
}
