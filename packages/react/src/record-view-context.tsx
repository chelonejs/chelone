/**
 * `EditContext` / `ShowContext` / `CreateContext` — the ambient CRUD-view
 * surfaces that ra-shaped views publish and their descendants read (parity:
 * ra-core's `EditContext`/`ShowContext`/`CreateContext`). shadmin's
 * `<EditView>`/`<ShowView>`/`<CreateView>` read `context.record` +
 * `context.defaultTitle`; guessers read `context.record`.
 *
 * Chelone shape: each context value is the vanilla record-controller state
 * (P4 `EditControllerState`/`ShowControllerState`/`CreateControllerState`)
 * PLUS the ra view fields the views need — `resource`, the computed
 * `defaultTitle`, and (edit/create) the `save`/`saving`/`mutationMode` save
 * surface. So `EditContextValue`/`CreateContextValue` are structurally
 * `SaveContextValue`s: a view publishes the SAME object into both this context
 * and the `SaveContext` so nested save buttons work.
 *
 * The views that PUBLISH these (mount the providers from a controller result)
 * land in P7d; P7a authors the contexts + providers + reading hooks the ported
 * view/guesser/button code consumes. The reading hooks THROW without a provider
 * (ra parity for edit/show/create — a CRUD descendant with no view above it is
 * a wiring bug), unlike `useSaveContext`/`useRecordContext` which degrade.
 */

import type {
  CreateControllerState,
  EditControllerState,
  MutationMode,
  ResourceRecord,
  ShowControllerState,
} from "@chelone/core";
import { createContext, type ReactNode, useContext } from "react";
import type { SaveHandler } from "./save-context";

/* -------------------------------------------------------------------------- */
/* Edit                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The ambient edit surface: the record-controller state + the save surface +
 * the ra view fields. Structurally a `SaveContextValue` (save/saving/
 * mutationMode), so a view can publish it into `SaveContext` unchanged.
 */
export interface EditContextValue<RecordType = ResourceRecord>
  extends EditControllerState<RecordType> {
  /** The resource name (drives labels, breadcrumbs, the list link). */
  resource: string;
  /** Computed heading; the view falls back to it when no `title` prop is set. */
  defaultTitle?: string;
  /** Persists form values; resolves with server field errors or `undefined`. */
  save: SaveHandler<RecordType>;
  mutationMode?: MutationMode;
}

const EditContext = createContext<EditContextValue | null>(null);
EditContext.displayName = "EditContext";

export interface EditContextProviderProps<RecordType = ResourceRecord> {
  value: EditContextValue<RecordType>;
  children: ReactNode;
}

/** Publishes the ambient edit surface (mounted by an `<Edit>` view in P7d). */
export function EditContextProvider<RecordType = ResourceRecord>({
  value,
  children,
}: EditContextProviderProps<RecordType>): ReactNode {
  // type-escape: context: stores each view's value at its own record; `useEditContext` reads it back at the caller's
  const stored = value as EditContextValue;
  return <EditContext.Provider value={stored}>{children}</EditContext.Provider>;
}

/**
 * Read the ambient edit surface. THROWS without an `<EditContextProvider>` —
 * an edit descendant with no `<Edit>` above it is a wiring bug (ra parity).
 */
export function useEditContext<
  RecordType extends ResourceRecord = ResourceRecord,
>(): EditContextValue<RecordType> {
  const context = useContext(EditContext);
  if (!context) {
    throw new Error(
      "useEditContext: no <EditContextProvider> found above this component.",
    );
  }
  return context as EditContextValue<RecordType>;
}

/* -------------------------------------------------------------------------- */
/* Show                                                                       */
/* -------------------------------------------------------------------------- */

/** The ambient show surface: the record-controller state + the ra view fields. */
export interface ShowContextValue<
  RecordType extends ResourceRecord = ResourceRecord,
> extends ShowControllerState<RecordType> {
  resource: string;
  defaultTitle?: string;
}

const ShowContext = createContext<ShowContextValue | null>(null);
ShowContext.displayName = "ShowContext";

export interface ShowContextProviderProps<
  RecordType extends ResourceRecord = ResourceRecord,
> {
  value: ShowContextValue<RecordType>;
  children: ReactNode;
}

/** Publishes the ambient show surface (mounted by a `<Show>` view in P7d). */
export function ShowContextProvider<
  RecordType extends ResourceRecord = ResourceRecord,
>({ value, children }: ShowContextProviderProps<RecordType>): ReactNode {
  return <ShowContext.Provider value={value}>{children}</ShowContext.Provider>;
}

/**
 * Read the ambient show surface. THROWS without a `<ShowContextProvider>`
 * (ra parity). Show is read-only — no save surface.
 */
export function useShowContext<
  RecordType extends ResourceRecord = ResourceRecord,
>(): ShowContextValue<RecordType> {
  const context = useContext(ShowContext);
  if (!context) {
    throw new Error(
      "useShowContext: no <ShowContextProvider> found above this component.",
    );
  }
  return context as ShowContextValue<RecordType>;
}

/** The ambient show surface, or `null` outside a `<ShowContextProvider>`. */
export function useOptionalShowContext(): ShowContextValue | null {
  return useContext(ShowContext);
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The ambient create surface: the create-controller state (whose `record` is a
 * partial SEED, id-less) + the save surface + the ra view fields. Like edit, a
 * structural `SaveContextValue`.
 */
export interface CreateContextValue<RecordType = ResourceRecord>
  extends CreateControllerState<RecordType> {
  resource: string;
  defaultTitle?: string;
  save: SaveHandler<RecordType>;
  mutationMode?: MutationMode;
}

const CreateContext = createContext<CreateContextValue | null>(null);
CreateContext.displayName = "CreateContext";

export interface CreateContextProviderProps<RecordType = ResourceRecord> {
  value: CreateContextValue<RecordType>;
  children: ReactNode;
}

/** Publishes the ambient create surface (mounted by a `<Create>` view in P7d). */
export function CreateContextProvider<RecordType = ResourceRecord>({
  value,
  children,
}: CreateContextProviderProps<RecordType>): ReactNode {
  // type-escape: context: stores each view's value at its own record; `useCreateContext` reads it back at the caller's
  const stored = value as CreateContextValue;
  return (
    <CreateContext.Provider value={stored}>{children}</CreateContext.Provider>
  );
}

/**
 * Read the ambient create surface. THROWS without a `<CreateContextProvider>`
 * (ra parity).
 */
export function useCreateContext<
  RecordType extends ResourceRecord = ResourceRecord,
>(): CreateContextValue<RecordType> {
  const context = useContext(CreateContext);
  if (!context) {
    throw new Error(
      "useCreateContext: no <CreateContextProvider> found above this component.",
    );
  }
  return context as CreateContextValue<RecordType>;
}
