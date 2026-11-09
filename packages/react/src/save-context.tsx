/**
 * `SaveContext` — the ambient save handler + its status, published by a CRUD
 * view (`<Edit>`/`<Create>`) and consumed by save buttons and form toolbars
 * (parity: ra-core's `SaveContext`). shadmin's `<SaveButton>` reads
 * `useSaveContext().save` to persist form values on submit.
 *
 * Chelone divergences from ra-core, deliberate:
 * - `save` is chelone's controller `save` shape — `(data, options?) =>
 *   Promise<FieldErrors | undefined>` (resolves with server field errors on a
 *   `ValidationError`, `undefined` otherwise; never rejects for provider
 *   errors). ra's `SaveHandler` returns `Record<string,string>` OR a promise;
 *   chelone's is always the promise form (the P5 form contract).
 * - No `registerMutationMiddleware`/`unregisterMutationMiddleware`: chelone has
 *   no mutation-middleware stack. Omitted rather than stubbed.
 * - The context default is `{}` and `useSaveContext` NEVER throws (ra parity) —
 *   `<SaveButton>` reads `saveContext?.save` optionally, so an out-of-view
 *   button degrades to a plain submit rather than crashing.
 */

import type { MutationMode, ResourceRecord, SaveOptions } from "@chelone/core";
import { createContext, type ReactNode, useContext } from "react";

/**
 * The chelone save handler: resolves with server field errors or `undefined`.
 * Declared through a method so its parameters stay bivariant: a view publishes
 * a `SaveHandler<Post>` into a context typed for `ResourceRecord`, and each
 * context reads it back at the caller's record type.
 */
export type SaveHandler<RecordType> = {
  save(
    data: Partial<RecordType>,
    options?: SaveOptions<RecordType>,
  ): Promise<Record<string, string | string[]> | undefined>;
}["save"];

/**
 * The ambient save surface. Every field optional (ra parity): a view without a
 * save (a `<Show>`, or a form outside a CRUD view) provides the empty default.
 */
export interface SaveContextValue<RecordType = ResourceRecord> {
  /** Persists the form values; resolves with server field errors on validation failure. */
  save?: SaveHandler<RecordType>;
  /**
   * True while a save is in flight. ra deprecates this in favor of the form's
   * `isSubmitting`; kept for call-site parity (shadmin's toolbar reads it).
   */
  saving?: boolean;
  mutationMode?: MutationMode;
}

/** Default `{}` — an out-of-view consumer sees no save (ra parity). */
export const SaveContext = createContext<SaveContextValue>({});

SaveContext.displayName = "SaveContext";

export interface SaveContextProviderProps<RecordType = ResourceRecord> {
  value: SaveContextValue<RecordType>;
  children: ReactNode;
}

/**
 * Publishes the ambient save surface. A CRUD view (P7d) mounts this with the
 * `{ save, saving, mutationMode }` slice of its composed controller so nested
 * save buttons/toolbars can trigger the save.
 */
export function SaveContextProvider<RecordType = ResourceRecord>({
  value,
  children,
}: SaveContextProviderProps<RecordType>): ReactNode {
  // type-escape: context: stores each view's save at its own record; `useSaveContext` reads it back at the caller's
  const stored = value as SaveContextValue;
  return <SaveContext.Provider value={stored}>{children}</SaveContext.Provider>;
}

/**
 * Read the ambient save handler and its status. NON-throwing (ra parity): the
 * empty default lets an out-of-view `<SaveButton>` fall back to a plain form
 * submit. Callers read `save` optionally (`saveContext?.save`).
 */
export function useSaveContext<
  RecordType extends ResourceRecord = ResourceRecord,
>(): SaveContextValue<RecordType> {
  // type-escape: context: the view that published the save typed it at its own record, as `useEditContext` reads it
  return useContext(SaveContext) as SaveContextValue<RecordType>;
}
