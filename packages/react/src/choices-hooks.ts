import type {
  ChoiceRecord,
  ChoicesController,
  ChoicesControllerContext,
  ChoicesControllerOptions,
  ChoiceValueOf,
  FilterPayload,
  ResourceMap,
  SortPayload,
  SourcePath,
} from "@chelone/core";
import {
  choiceListsOf,
  createChoicesController,
  eraseChoicesController,
  getAtPath,
  noop,
  resolveChoiceValue,
  textOf,
} from "@chelone/core";
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { type CheloneContextValue, useCheloneContext } from "./context";
import { useTranslate } from "./i18n-hooks";

/** An erased choice record — choices carry arbitrary shapes (`{id, name, ...}`). Core owns the type; both adapters re-export it. */
export type { ChoiceRecord };

/**
 * The unified choices context every choice input consumes — a reference-backed
 * controller (live list) OR a synthesized inline-choices list share this
 * shape. `isFromReference` distinguishes them; the list-mutation actions are
 * no-ops on an inline context (pagination off).
 */
export interface ChoicesContextValue<
  TChoice extends ChoiceRecord = ChoiceRecord,
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
  /** The referenced resource name (inline: undefined). */
  resource: string | undefined;
  /** The FK/source field on the referencing side. */
  source: string | undefined;
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
 * A static context over inline choices (ra parity): the full list IS every
 * view, pagination is off, `isFromReference` is false, and the list-mutation
 * actions are inert.
 */
function synthesizeInlineChoices(
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

const ChoicesContext = createContext<ChoicesContextValue | null>(null);

/** Inline-choices config for {@link ChoicesContextProvider}. */
export interface InlineChoicesConfig {
  choices: readonly (string | ChoiceRecord)[];
  source?: string;
}

export interface ChoicesContextProviderProps {
  /**
   * A ready {@link ChoicesContextValue} (e.g. `useReferenceInput`'s context)
   * OR an inline-choices config (`{ choices }`) synthesized here.
   */
  value: ChoicesContextValue | InlineChoicesConfig;
  children: ReactNode;
}

function isInlineConfig(
  value: ChoicesContextValue | InlineChoicesConfig,
): value is InlineChoicesConfig {
  return !("isFromReference" in value);
}

/**
 * Provides an ambient {@link ChoicesContextValue} to choice inputs below.
 * Accepts either a live context (reference input) or an inline-choices config
 * that it synthesizes into a static context.
 */
export function ChoicesContextProvider({
  value,
  children,
}: ChoicesContextProviderProps): ReactNode {
  const resolved = useMemo<ChoicesContextValue>(
    () =>
      isInlineConfig(value)
        ? synthesizeInlineChoices(value.choices, value.source)
        : value,
    [value],
  );
  return createElement(ChoicesContext.Provider, { value: resolved }, children);
}

/** Options for {@link useChoicesContext} (props-over-context: inline choices win). */
export interface UseChoicesContextOptions {
  /** Inline choices — synthesized into a static context, ignoring any ambient one. */
  choices?: readonly (string | ChoiceRecord)[];
  /** The FK/source field (metadata carried onto the synthesized context). */
  source?: string;
}

/**
 * Resolves the choices context (ra's `useChoicesContext`, props-over-context):
 * inline `choices` synthesize a static context; otherwise the ambient
 * {@link ChoicesContextProvider} value is returned. Throws if neither is
 * present.
 */
export function useChoicesContext<TChoice extends ChoiceRecord = ChoiceRecord>(
  options: UseChoicesContextOptions = {},
): ChoicesContextValue<TChoice> {
  const ambient = useContext(ChoicesContext);
  const inline = options.choices;
  const synthesized = useMemo<ChoicesContextValue | null>(
    () => (inline ? synthesizeInlineChoices(inline, options.source) : null),
    // The choices identity + source drive re-synthesis.
    [inline, options.source],
  );
  const resolved = synthesized ?? ambient;
  if (!resolved) {
    throw new Error(
      "useChoicesContext: pass `choices` or wrap in a <ChoicesContextProvider>.",
    );
  }
  // type-escape: context: holds the erased value; the caller names its choice shape
  return resolved as ChoicesContextValue<TChoice>;
}

/** A path into a choice, or a formatter over the whole choice. */
export type OptionText<TChoice extends ChoiceRecord = ChoiceRecord> =
  | SourcePath<TChoice>
  | ((choice: TChoice) => string);

export interface UseChoicesOptions<
  TChoice extends ChoiceRecord = ChoiceRecord,
> {
  /** The display path or a formatter. Default `'name'`. */
  optionText?: OptionText<TChoice>;
  /** The value path. Default `'id'`. */
  optionValue?: SourcePath<TChoice>;
  /** The disabled-flag path. Default `'disabled'`. */
  disableValue?: SourcePath<TChoice>;
  /** Translate a string-path text through the catalog (default true). */
  translateChoice?: boolean;
}

/** The choice accessors a choice input needs. */
export interface UseChoicesResult<TChoice extends ChoiceRecord = ChoiceRecord> {
  /** The display text: string path (optionally translated) or the formatter's output. */
  getChoiceText(choice: TChoice): string;
  /** The value: `get(choice, optionValue)`, falling back to `choice.id`. */
  getChoiceValue(choice: TChoice): ChoiceValueOf<TChoice>;
  /** The disabled flag: `get(choice, disableValue)`. */
  getDisableValue(choice: TChoice): boolean;
}

/**
 * Read a choice option path. An empty path reads nothing: core's `getAtPath`
 * returns the record itself for `""`, which would render `[object Object]` as
 * the label and submit the whole choice as the field value.
 */
const readChoicePath = (choice: ChoiceRecord, path: string): unknown =>
  path === "" ? undefined : getAtPath(choice, path);

/**
 * The choice accessors (ra's `useChoices`): text (string path or formatter,
 * translated with a `{_: name}` fallback so a non-key label renders as-is),
 * value (`optionValue` path or `id`), and disabled flag. Every path reads
 * through core's {@link getAtPath}, so `optionText: "author[0].name"` resolves
 * like `useFieldValue` does.
 */
export function useChoices<TChoice extends ChoiceRecord = ChoiceRecord>(
  options: UseChoicesOptions<TChoice> = {},
): UseChoicesResult<TChoice> {
  // The `"name"`/`"id"`/`"disabled"` defaults are paths a `TChoice` need not
  // have, so each lands on a plain local: `readChoicePath` takes any string,
  // and only a formatter needs `TChoice`.
  const optionText: ((choice: TChoice) => string) | string =
    options.optionText ?? "name";
  const optionValue: string = options.optionValue ?? "id";
  const disableValue: string = options.disableValue ?? "disabled";
  const translateChoice: boolean = options.translateChoice ?? true;
  const translate = useTranslate();

  return useMemo<UseChoicesResult<TChoice>>(
    () => ({
      getChoiceText(choice) {
        if (typeof optionText === "function") return optionText(choice);
        const raw = readChoicePath(choice, optionText);
        const text = textOf(raw);
        if (!translateChoice) return text;
        // ra's `{_: name}` convention: translate the text as a key, but fall
        // back to the raw text when it is not a catalog key (chelone's
        // translate returns the key unchanged on a miss).
        const translated = translate(text, { _: text });
        return translated === text ? text : translated;
      },
      getChoiceValue(choice) {
        return resolveChoiceValue(choice, readChoicePath(choice, optionValue));
      },
      getDisableValue(choice) {
        return readChoicePath(choice, disableValue) === true;
      },
    }),
    [optionText, optionValue, disableValue, translateChoice, translate],
  );
}

/** Structurally the choices-controller context (data services + i18n). */
function toChoicesContext<TResources extends ResourceMap>(
  ctx: CheloneContextValue<TResources>,
): ChoicesControllerContext<TResources> {
  const { dataProvider, queryClient, notifications, i18n } = ctx;
  return {
    dataProvider,
    queryClient,
    notifications,
    translate: i18n ? (key) => i18n.translate(key) : undefined,
  };
}

/** `useReferenceInput` options: the controller options minus the injected ctx. */
export type UseReferenceInputOptions<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
> = ChoicesControllerOptions<TResources, TName>;

/** The reference-input result: the live choices context plus its actions. */
export type UseReferenceInputResult = ChoicesContextValue;

/**
 * React bridge for the vanilla choices controller (reference input). Follows
 * the ratified 4R binding pattern (see `useListController`): inert lazy
 * construction, attach on `useSyncExternalStore`'s first commit-phase
 * subscribe (both QueryObservers), release on last unsubscribe, deliberately
 * NO destroy effect. `ctx`/`options` changes after mount are IGNORED — remount
 * with a `key` to change them.
 *
 * Provides a `ChoicesContextValue` a choice input consumes via
 * {@link useChoicesContext}; wrap children in {@link ChoicesContextProvider}
 * passing this result.
 */
export function useReferenceInput<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseReferenceInputOptions<TResources, TName>,
): UseReferenceInputResult {
  const ctx = useCheloneContext<TResources>();

  const [controller] = useState<ChoicesController<ChoiceRecord>>(() =>
    eraseChoicesController(
      createChoicesController<TResources, TName>(
        toChoicesContext(ctx),
        options,
      ),
    ),
  );

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );

  return useMemo<ChoicesContextValue>(() => {
    const { allChoices, availableChoices, selectedChoices } =
      choiceListsOf(snapshot);
    return {
      allChoices,
      availableChoices,
      selectedChoices,
      total: snapshot.total,
      isPending: snapshot.isPending,
      isFetching: snapshot.isFetching,
      error: snapshot.error,
      page: snapshot.page,
      perPage: snapshot.perPage,
      sort: snapshot.sort,
      filter: snapshot.filter,
      hasNextPage: snapshot.hasNextPage,
      hasPreviousPage: snapshot.hasPreviousPage,
      resource: snapshot.resource,
      source: snapshot.source,
      isFromReference: true,
      setPage: controller.setPage,
      setPerPage: controller.setPerPage,
      setSort: controller.setSort,
      setFilters: controller.setFilters,
      setValue: controller.setValue,
      refetch: controller.refetch,
    };
  }, [snapshot, controller]);
}
