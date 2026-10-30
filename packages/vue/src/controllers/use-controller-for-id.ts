/**
 * Shared by the reference-field composables: one controller per resolved
 * record id, rebuilt when the id changes. Each controller lives in its own
 * effect scope with its own `useStore` subscription, so stopping that scope is
 * the 4R release: the old controller's observer detaches the moment the id
 * moves on, and the last scope disposal releases the final one.
 */

import type { Identifier, MicroStore } from "@chelone/core";
import {
  type EffectScope,
  effectScope,
  onScopeDispose,
  type Ref,
  shallowRef,
  watch,
} from "vue";
import type { RecordValue } from "../record/record-context";
import { useStore } from "../store/use-store";

export type SourceId = Identifier | null | undefined;

export interface BoundController<TController, TState> {
  controller: TController;
  state: Readonly<Ref<TState>>;
}

/** The value `source` names on the record, read as a foreign-key id. */
export function sourceId(record: RecordValue, source: string): SourceId {
  return (record as Record<string, unknown> | undefined)?.[source] as SourceId;
}

export function useControllerForId<
  TState,
  TController extends MicroStore<TState>,
>(
  id: Readonly<Ref<SourceId>>,
  create: (id: SourceId) => TController,
): Readonly<Ref<BoundController<TController, TState>>> {
  let scope: EffectScope;
  const bind = (value: SourceId): BoundController<TController, TState> => {
    scope = effectScope();
    // `run` returns undefined only for a stopped scope, and this one is new.
    return scope.run(() => {
      const controller = create(value);
      return { controller, state: useStore<TState>(controller) };
    }) as BoundController<TController, TState>;
  };

  const bound = shallowRef(bind(id.value));
  // Sync flush: the swap must not leave a frame reading the previous record's rows.
  watch(
    id,
    (next) => {
      scope.stop();
      bound.value = bind(next);
    },
    { flush: "sync" },
  );
  onScopeDispose(() => scope.stop());
  return bound;
}
