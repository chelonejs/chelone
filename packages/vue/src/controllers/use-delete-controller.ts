/**
 * `useDeleteController` — the Vue bridge for the vanilla core delete controller,
 * the twin of `@chelone/react`'s `useDeleteController` (`controller-hooks.ts`).
 * A delete has NOTHING to fetch; the only acquired resource is the shared
 * `MutationObserver`, attached on mount and released on scope disposal through
 * `useMicroStore`'s 4R lifecycle.
 *
 * `deleteOne` is the controller's own pipeline: delete → notify `deleted` →
 * request the list redirect → strip the id from the `${resource}.selectedIds`
 * selection. A provider error notifies `http_error` and resolves; it never rejects.
 */

import {
  createDeleteController,
  type DeleteController,
  type DeleteControllerOptions,
  type DeleteControllerState,
  type MicroStore,
  type RecordOf,
  type ResourceMap,
} from "@chelone/core";
import { computed, reactive } from "vue";
import { useCheloneContext } from "../context";
import { useRequiredResource } from "../resource-context";
import { useMicroStore } from "../store/use-micro-store";
import { toControllerContext } from "./controller-context";

/** Options for {@link useDeleteController}: the core delete options + a resource override. */
export interface UseDeleteControllerOptions extends DeleteControllerOptions {
  /** Target a specific resource; defaults to the ambient `<Resource>` name. */
  resource?: string;
}

/** The reactive result: the delete-controller state (unwrapped, live) plus the stable `deleteOne`. */
export type UseDeleteControllerReturn<TRecord> = DeleteControllerState &
  Omit<DeleteController<TRecord>, keyof MicroStore<DeleteControllerState>>;

export function useDeleteController<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseDeleteControllerOptions = {},
): UseDeleteControllerReturn<RecordOf<TResources, TName>> {
  type TRecord = RecordOf<TResources, TName>;
  const ctx = useCheloneContext<TResources>();
  const resource = useRequiredResource("useDeleteController", options) as TName;

  const controller: DeleteController<TRecord> = createDeleteController(
    toControllerContext(ctx),
    resource,
    options,
  );

  const state = useMicroStore(controller);

  return reactive({
    saving: computed(() => state.value.saving),
    deleteOne: controller.deleteOne,
  }) as UseDeleteControllerReturn<TRecord>;
}
