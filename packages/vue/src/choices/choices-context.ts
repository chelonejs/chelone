/**
 * The unified choices context (ra's `ChoicesContext` / `useChoicesContext`), the
 * Vue twin of `@chelone/react`'s `ChoicesContextProvider` + `useChoicesContext`
 * (`choices-hooks.ts`). A reference-backed controller (live list — see
 * {@link useReferenceInput}) OR a synthesized inline-choices list share ONE
 * shape; `isFromReference` distinguishes them, and the list-mutation actions are
 * inert no-ops on an inline context.
 *
 * Idiom translation from the React twin: React threads the value through a
 * `createContext` provider + `useContext`; the inline path synthesizes a static
 * context inside `ChoicesContextProvider`/`useChoicesContext`. Vue `provide`s the
 * value under a typed `InjectionKey` and reads it with `inject`. The reference
 * context carries its reactive data through GETTERS (see {@link useReferenceInput})
 * so a plain property read tracks the controller store — Vue's answer to React
 * re-deriving the object each render. The inline context is a frozen plain object.
 */

import type { ChoiceRecord, FilterPayload, SortPayload } from "@chelone/core";
import { noop } from "@chelone/core";
import { type InjectionKey, inject, provide } from "vue";

/**
 * The choices context every choice input consumes. A reference context fills the
 * data fields through getters (reactive); an inline context is static. The
 * list-mutation actions are inert on an inline context.
 */
export interface ChoicesContextValue<
  TChoice extends ChoiceRecord = ChoiceRecord,
  TSource extends string = string,
> {
  allChoices: TChoice[];
  availableChoices: TChoice[];
  selectedChoices: TChoice[];
  total: number | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: Error | null;
  page: number;
  perPage: number;
  sort: SortPayload<TChoice>;
  filter: FilterPayload<TChoice>;
  hasNextPage: boolean | undefined;
  hasPreviousPage: boolean | undefined;
  /** The referenced resource name (inline: `undefined`). */
  resource: string | undefined;
  /** The FK/source field on the referencing side. */
  source: TSource | undefined;
  /** `true` for a reference context, `false` for an inline-choices context. */
  isFromReference: boolean;
  setPage(page: number): void;
  setPerPage(perPage: number): void;
  setSort(sort: SortPayload<TChoice>): void;
  setFilters(filter: FilterPayload<TChoice>, debounce?: boolean): void;
  setValue(value: unknown): void;
  refetch(): void;
}

const DEFAULT_SORT: SortPayload<ChoiceRecord> = { field: "id", order: "DESC" };

/** Coerces a `string | ChoiceRecord` into a `{ id, name }`-bearing choice. */
function toChoiceRecord(choice: string | ChoiceRecord): ChoiceRecord {
  return typeof choice === "string" ? { id: choice, name: choice } : choice;
}

/**
 * A static context over inline choices (ra parity): the full list IS every view,
 * pagination is off, `isFromReference` is false, and the list-mutation actions
 * are inert.
 */
export function synthesizeInlineChoices(
  choices: readonly (string | ChoiceRecord)[],
  source?: string,
): ChoicesContextValue {
  const records = choices.map(toChoiceRecord);
  return {
    allChoices: records,
    availableChoices: records,
    selectedChoices: [],
    total: records.length,
    isPending: false,
    isFetching: false,
    error: null,
    page: 1,
    perPage: records.length,
    sort: DEFAULT_SORT,
    filter: {},
    hasNextPage: false,
    hasPreviousPage: false,
    resource: undefined,
    source,
    isFromReference: false,
    setPage: noop,
    setPerPage: noop,
    setSort: noop,
    setFilters: noop,
    setValue: noop,
    refetch: noop,
  };
}

/** Inline-choices config for {@link provideChoicesContext}. */
export interface InlineChoicesConfig {
  choices: readonly (string | ChoiceRecord)[];
  source?: string;
}

/** The provide/inject key for the ambient choices context. */
export const ChoicesContextKey: InjectionKey<ChoicesContextValue> = Symbol(
  "chelone-choices-context",
);

function isInlineConfig(
  value: ChoicesContextValue | InlineChoicesConfig,
): value is InlineChoicesConfig {
  return !("isFromReference" in value);
}

/**
 * Provides an ambient {@link ChoicesContextValue} to choice inputs below (the
 * Vue analog of React's `<ChoicesContextProvider>`). Accepts either a live
 * context (from {@link useReferenceInput}) or an inline-choices config that it
 * synthesizes into a static context. Call in `setup`.
 */
export function provideChoicesContext(
  value: ChoicesContextValue | InlineChoicesConfig,
): void {
  provide(
    ChoicesContextKey,
    isInlineConfig(value)
      ? synthesizeInlineChoices(value.choices, value.source)
      : value,
  );
}

/** Options for {@link useChoicesContext} (props-over-context: inline choices win). */
export interface UseChoicesContextOptions<TSource extends string = string> {
  /** Inline choices — synthesized into a static context, ignoring any ambient one. */
  choices?: readonly (string | ChoiceRecord)[];
  /** The FK/source field (metadata carried onto the synthesized context). */
  source?: TSource;
}

/**
 * Resolves the choices context (ra's `useChoicesContext`, props-over-context):
 * inline `choices` synthesize a static context; otherwise the ambient
 * {@link provideChoicesContext} value is returned. Throws if neither is present.
 * Call in `setup`.
 */
export function useChoicesContext<
  TChoice extends ChoiceRecord = ChoiceRecord,
  TSource extends string = string,
>(
  options: UseChoicesContextOptions<TSource> = {},
): ChoicesContextValue<TChoice, TSource> {
  const ambient = inject(ChoicesContextKey, null);
  const resolved = options.choices
    ? synthesizeInlineChoices(options.choices, options.source)
    : ambient;
  if (!resolved) {
    throw new Error(
      "useChoicesContext: pass `choices` or call provideChoicesContext() above.",
    );
  }
  // type-escape: context: the context holds the erased value; the caller names its choice shape and the source it passes on
  return resolved as ChoicesContextValue<TChoice, TSource>;
}
