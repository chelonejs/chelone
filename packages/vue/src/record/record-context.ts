/**
 * `RecordContext` — the ambient CURRENT RECORD that record-scoped components
 * (every field, a reference resolution, an iterator row) read to know which
 * record they render. The Vue twin of `@chelone/react`'s
 * `record/record-context.tsx` (`RecordContext` + `useRecordContext`).
 *
 * Idiom translation from the React twin: React threads the record through a
 * `createContext` provider read with `useContext`. Vue `provide`s the record
 * (a `Ref` so it stays reactive as a controller resolves it) under a typed
 * `InjectionKey` and reads it with `inject`. A `record` prop always overrides
 * the ambient value (parity with ra-core's `useRecordContext`), so a component
 * can render a different record inline without a nested provider.
 *
 * The provided value is a `Ref<RecordValue>` (not a bare record): a DataTable
 * row / an Edit view publishes a record that arrives asynchronously, and
 * downstream fields must re-render when it lands. `useRecordContext` unwraps to
 * the current value (a plain read) so field code never juggles refs.
 */

import type { LooseRecord } from "@chelone/core";
import {
  type ComputedRef,
  computed,
  type InjectionKey,
  inject,
  isRef,
  provide,
  type Ref,
  ref,
} from "vue";

/** A record in scope, or `undefined` when none is (mirrors ra-core's union). */
export type RecordValue<RecordType = LooseRecord> = RecordType | undefined;

/** The provide/inject key for the ambient record (a reactive ref). */
export const RecordContextKey: InjectionKey<Ref<RecordValue>> = Symbol(
  "chelone-record-context",
);

/**
 * Provide the ambient record to the subtree. Accepts a bare record or a `Ref`
 * (a controller's reactive record); a bare value is wrapped so the contract is
 * uniform. Mirrors ra-core: an absent record still provides (an `undefined`
 * ref) — a nested field reads `undefined` and renders its empty state.
 */
export function provideRecordContext<RecordType = LooseRecord>(
  record: RecordValue<RecordType> | Ref<RecordValue<RecordType>>,
): void {
  const asRef = (isRef(record) ? record : ref(record)) as Ref<RecordValue>;
  provide(RecordContextKey, asRef);
}

/** Options a record-scoped composable accepts to override the ambient record. */
export interface UseRecordContextOptions<RecordType = LooseRecord> {
  /** Target a specific record; wins over the ambient one. */
  record?: RecordValue<RecordType>;
}

/**
 * The reactive form of {@link useRecordContext}: a computed that follows both
 * the ambient ref and the `record` getter, for a component whose `record` prop
 * or ambient record can change after setup (an Edit view publishes its record
 * once the fetch lands). Call it in `setup`, since it injects.
 */
export function useRecordContextRef<RecordType = LooseRecord>(
  record?: () => RecordValue<RecordType>,
): ComputedRef<RecordValue<RecordType>> {
  const injected = inject(RecordContextKey, null);
  return computed(() => {
    const explicit = record?.();
    if (explicit !== undefined) return explicit;
    // type-escape: context: the provider publishes the record at LooseRecord; the caller names the record type it expects, as in React's `useRecordContext<RecordType>()`
    return injected?.value as RecordValue<RecordType>;
  });
}

/**
 * Read the ambient record's current value. A `record` prop always wins over the
 * injected ref (parity: ra-core's `useRecordContext`). Returns `undefined` when
 * neither a prop nor an ancestor provider supplies one. A plain read at call
 * time: use {@link useRecordContextRef} where the record can change.
 */
export function useRecordContext<RecordType = LooseRecord>(
  options?: UseRecordContextOptions<RecordType>,
): RecordValue<RecordType> {
  return useRecordContextRef<RecordType>(() => options?.record).value;
}
