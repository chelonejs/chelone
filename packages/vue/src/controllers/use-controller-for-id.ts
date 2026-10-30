/**
 * Shared by the reference-field composables: one controller per resolved
 * record id, rebuilt when the id changes. Each controller lives in its own
 * effect scope with its own `useStore` subscription, so stopping that scope is
 * the 4R release: the old controller's observer detaches the moment the id
 * moves on, and the last scope disposal releases the final one.
 */

import type { Identifier, MicroStore } from "@chelone/core";
import {
  effectScope,
  onScopeDispose,
  type Ref,
  shallowRef,
  watch,
} from "vue";
import type { RecordValue } from "../record/record-context";
import { useStore } from "../store/use-store";

export type SourceId = Identifier | undefined;

export interface BoundController<TController, TState> {
  controller: TController;
  state: Readonly<Ref<TState>>;
}

/** The foreign key `source` holds on the record; anything but a string or number reads as no key. */
export function foreignKeyOf(record: RecordValue, source: string): SourceId {
  const value = (record as Record<string, unknown> | undefined)?.[source];
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

/**
 * Builds `create(id)` inside a scope of its own and keeps it bound to `id`:
 * when `id` changes the new controller is built and bound first, then the
 * previous scope stops, so a `create` that throws leaves the old binding live
 * and leaks nothing. The returned ref swaps synchronously on a change, so no
 * frame reads the previous record's rows. Call it from `setup`: the last
 * binding stops with the caller's scope.
 */
export function useControllerForId<
  TState,
  TController extends MicroStore<TState>,
>(
  id: Readonly<Ref<SourceId>>,
  create: (id: SourceId) => TController,
): Readonly<Ref<BoundController<TController, TState>>> {
  const bind = (value: SourceId) => {
    const scope = effectScope();
    try {
      // `run` returns undefined only for a stopped scope, and this one is new.
      const bound = scope.run(() => {
        const controller = create(value);
        return { controller, state: useStore<TState>(controller) };
      }) as BoundController<TController, TState>;
      return { scope, bound };
    } catch (error) {
      scope.stop();
      throw error;
    }
  };

  let current = bind(id.value);
  const bound = shallowRef(current.bound);
  watch(
    id,
    (next) => {
      const previous = current;
      current = bind(next);
      bound.value = current.bound;
      previous.scope.stop();
    },
    { flush: "sync" },
  );
  onScopeDispose(() => current.scope.stop());
  return bound;
}
