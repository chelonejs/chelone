/**
 * `RecordContext` — the ambient CURRENT RECORD that record-scoped components
 * (every field, most inputs' defaults) read to know which record they render
 * (parity: ra-core's `RecordContext`). A CRUD view (`<Edit>`/`<Show>`) or an
 * iterator row publishes the record here; a `record` prop always overrides the
 * context value (`useRecordContext`) so a component can render a different
 * record inline without a nested provider.
 *
 * Convention note (chelone divergence from ra-core): the provider renders its
 * subtree BARE when no `value` is present, matching this package's
 * `ResourceContextProvider`. ra-core's `RecordContextProvider` wraps
 * unconditionally. The conditional render is the more useful contract for
 * nested record contexts — a value-less provider is a pass-through, so a nested
 * `useRecordContext` still sees the closest NON-empty ancestor rather than
 * being shadowed by an empty context. Every shadmin call site passes a defined
 * `value`, so the behavior is call-site-compatible.
 */

import type { LooseRecord } from "@chelone/core";
import { createContext, type ReactNode, useContext } from "react";

/**
 * A record with an `id`, or an id-less draft (`Omit<..., "id">`) — a create
 * form's in-flight record has no id yet — or `undefined` when no record is in
 * scope. Matches ra-core's `RaRecord | Omit<RaRecord, "id"> | undefined`.
 */
export type RecordContextValue<RecordType = LooseRecord> =
  | RecordType
  | undefined;

/**
 * Holds the current record. Default `undefined` (no ambient record). Typed
 * `unknown` because a typed record narrows only at the read edge
 * (`useRecordContext<RecordType>()`); a concrete record (e.g. `{ id, title }`)
 * has no string index signature so is not structurally a `LooseRecord`.
 */
export const RecordContext = createContext<unknown>(undefined);

RecordContext.displayName = "RecordContext";

export interface RecordContextProviderProps<RecordType = LooseRecord> {
  /**
   * The record to publish. When absent the provider is a pass-through (does
   * NOT push an empty context), so a nested `useRecordContext` still sees the
   * closest non-empty ancestor.
   */
  value?: RecordContextValue<RecordType>;
  children: ReactNode;
}

/**
 * Provide the ambient record to the subtree. Mirrors this package's
 * `ResourceContextProvider`: when `value` is empty the provider renders
 * children directly rather than shadowing an ancestor record with `undefined`.
 */
export function RecordContextProvider<RecordType = LooseRecord>({
  value,
  children,
}: RecordContextProviderProps<RecordType>): ReactNode {
  return value ? (
    <RecordContext.Provider value={value}>{children}</RecordContext.Provider>
  ) : (
    children
  );
}

/** Props a record-scoped hook accepts to override the ambient record. */
export interface UseRecordContextOptions<RecordType = LooseRecord> {
  record?: RecordContextValue<RecordType>;
}

/**
 * Read the ambient record. A `record` prop always wins over the context value
 * (parity: ra-core's `useRecordContext`), so a caller can target a specific
 * record inline. Returns `undefined` when neither a prop nor an ancestor
 * provider supplies one.
 */
export function useRecordContext<RecordType = LooseRecord>(
  props?: UseRecordContextOptions<RecordType>,
): RecordContextValue<RecordType> {
  const context = useContext(RecordContext) as RecordContextValue<RecordType>;
  return props?.record ?? context;
}
