/**
 * `useCreateController` — the Vue bridge for the vanilla core create controller,
 * the twin of `@chelone/react`'s `useCreateController` (`controller-hooks.ts`).
 * A create has NOTHING to fetch (`isPending` is false from birth); the only
 * acquired resource is the shared update/create `MutationObserver`, attached on
 * mount and released on scope disposal through `useMicroStore`'s 4R lifecycle.
 *
 * `save` is the controller's own create pipeline over `ctx.queryClient` (the
 * vue-query client `<Admin>` provides): validate → persist → notify, resolving
 * the server's field errors on `ValidationError`. As with edit, the FORM
 * reconciliation is layered on in the form composables (Task 6) — this stays the
 * thin controller bridge the React twin mirrors.
 */

import {
  type CreateController,
  type CreateControllerOptions,
  type CreateControllerState,
  createCreateController,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
} from "@chelone/core";
import { computed, reactive } from "vue";
import { useCheloneContext } from "../context";
import { useRequiredResource } from "../resource-context";
import { useMicroStore } from "../store/use-micro-store";
import { toControllerContext } from "./controller-context";

/** Options for {@link useCreateController}: the core create options + a resource override. */
export interface UseCreateControllerOptions<TRecord>
  extends CreateControllerOptions<TRecord> {
  /** Target a specific resource; defaults to the ambient `<Resource>` name. */
  resource?: string;
}

/** The reactive result: the create-controller state (unwrapped, live) plus the stable `save`. */
export type UseCreateControllerReturn<TRecord> =
  CreateControllerState<TRecord> &
    Omit<
      CreateController<TRecord>,
      keyof MicroStore<CreateControllerState<TRecord>>
    >;

export function useCreateController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseCreateControllerOptions<RecordOf<TResources, TName>> = {},
): UseCreateControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const resource = useRequiredResource<TName>("useCreateController", options);

  const controller: CreateController<TRecord> = createCreateController(
    toControllerContext(ctx),
    resource,
    options,
  );

  const state = useMicroStore(controller);

  return reactive({
    record: computed(() => state.value.record),
    isPending: computed(() => state.value.isPending),
    saving: computed(() => state.value.saving),
    save: controller.save,
  }) as UseCreateControllerReturn<TRecord>;
}
