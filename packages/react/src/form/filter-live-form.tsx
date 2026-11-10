import type {
  CheloneFormApi,
  FieldErrors,
  FilterPayload,
  ListContextSurface,
  ResourceRecord,
  SourceScope,
} from "@chelone/core";
import {
  filterFormReflectShape,
  getFilterFormValues,
  mergeFilterValues,
  revalidateLogic,
} from "@chelone/core";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react";
import {
  CheloneFormProvider,
  SourceContextProvider,
  useResourceSourceScope,
} from "../form-context";
import { useForm } from "../form-hooks";
import { useResourceContext } from "../resource";
import { FormGroupsProvider } from "./group-hooks";

/**
 * FilterLiveForm (P6 W2-T2) — a form that auto-submits its child input values
 * into a list's `setFilters`. Sits beside a filter UI (a `<FilterList>`, a
 * search box) and keeps the list filter in sync as the user types.
 *
 * Chelone owns the debounce ONCE, in the list-controller: `setFilters(filter,
 * displayed?, debounced?)` already debounces (default 500ms) + strips empties +
 * resets the page (P4). So this form DELEGATES the debounce — it pushes on
 * every change with `debounced=true` and never re-implements a timer (cleaner
 * than ra, which debounces again in the form). The `debounce` prop is accepted
 * for API familiarity but is ADVISORY: the effective delay is the list
 * controller's own `debounceMs`. See the report for the rationale.
 */

/* -------------------------------------------------------------------------- */
/* List context (the seam a `<List>` view provides — P7)                      */
/* -------------------------------------------------------------------------- */

/**
 * The ambient list surface. Mirrors ra-core's `ListContext` (the list
 * controller result). A React context cannot be generic, so `ListContextSurface`
 * erases it: `data` carries the record type the caller names, and the filter is
 * an open key map — what writes a context filter (a filter form, a calendar
 * range, a URL) names no record keys. `useListContext<T>()` reads it back typed.
 */
export type ListContextValue<
  RecordType extends ResourceRecord = ResourceRecord,
> = ListContextSurface<RecordType>;

const ListContext = createContext<ListContextValue | null>(null);

export interface ListContextProviderProps {
  /** The list controller result — `useListController(...)`'s return value. */
  value: ListContextValue;
  children: ReactNode;
}

/**
 * Provides the ambient list surface to filter/aggregation components below.
 * A future `<List>`/`<ListBase>` view (P7) mounts this around its children with
 * the value from `useListController`; FilterLiveForm reads it here.
 */
export function ListContextProvider({
  value,
  children,
}: ListContextProviderProps): ReactNode {
  return <ListContext.Provider value={value}>{children}</ListContext.Provider>;
}

/**
 * The ambient list surface; throws without a `<ListContextProvider>` above.
 * FilterLiveForm/useFilterForm use it to read the list's `filter` + push
 * `setFilters`.
 */
export function useListContext<
  RecordType extends ResourceRecord = ResourceRecord,
>(): ListContextValue<RecordType> {
  const ctx = useContext(ListContext);
  if (!ctx) {
    throw new Error(
      "useListContext: no <ListContextProvider> found above this component.",
    );
  }
  // type-escape: context: a context cannot carry the record type, so the erased list is read back as the record the caller names
  return ctx as ListContextValue<RecordType>;
}

export { getFilterFormValues };

/* -------------------------------------------------------------------------- */
/* useFilterForm                                                              */
/* -------------------------------------------------------------------------- */

/** Options for {@link useFilterForm} / props shared by {@link FilterLiveForm}. */
export interface UseFilterFormOptions {
  /** Overrides the ambient resource (drives the filter-flavored labels). */
  resource?: string;
  /**
   * ADVISORY debounce (ms) for API parity with ra. The EFFECTIVE debounce is
   * the list controller's own `debounceMs` — FilterLiveForm delegates it and
   * does not add a form-side timer.
   */
  debounce?: number;
}

/** What {@link useFilterForm} returns: the form + provider inputs. */
export interface UseFilterFormResult {
  /** The form to expose via `<CheloneFormProvider>` (erased filter-values shape). */
  form: CheloneFormApi<FilterPayload>;
  /** The filter-flavored source scope (identity source, resource-keyed labels). */
  sourceScope: SourceScope;
  /** Validity: `false` blocks a filter push (the validity gate). */
  canSubmit: boolean;
}

/** A filter form never saves — the save pipeline is a no-op. */
const noopSave = async (): Promise<FieldErrors | undefined> => undefined;

/**
 * Headless half of {@link FilterLiveForm}. Reads the ambient list's `filter` +
 * `setFilters`, builds a standalone form controller seeded from the current
 * filter (`resetOnSuccess:false` — a filter form never saves), pushes value
 * changes into `setFilters(merged, undefined, /*debounced*​/ true)` behind a
 * validity gate, and mirrors EXTERNAL filter changes back into the form with a
 * `hasJustBeenModifiedByUser` guard so a stale (debounced) external value never
 * clobbers what the user is actively typing.
 */
export function useFilterForm(
  options: UseFilterFormOptions = {},
): UseFilterFormResult {
  const list = useListContext();
  const resource = useResourceContext(options);

  // Seed defaults from the CURRENT filter — captured on first render (the form
  // controller options are captured-once by `useForm`; the external-reflect
  // effect keeps it in sync afterwards).
  const initialFilterRef = useRef(list.filter);
  const { form, canSubmit } = useForm<FilterPayload>({
    defaultValues: { ...initialFilterRef.current },
    resetOnSuccess: false,
    save: noopSave,
    // A filter form never submits, so the default revalidate-on-submit strategy
    // would never run field validators and the validity gate would be inert.
    // Validate on change from the start so `canSubmit` reflects live validity.
    formOptions: {
      validationLogic: revalidateLogic({
        mode: "change",
        modeAfterSubmission: "change",
      }),
    },
  });

  const setFilters = list.setFilters;
  const filter = list.filter;

  // Guards. `hasJustBeenModifiedByUser` is set on a user change and consumed by
  // the external-reflect effect (skip one reflect). `isReflecting` marks OUR
  // own `form.reset` so the value-change listener ignores that transition.
  const hasJustBeenModifiedByUser = useRef(false);
  const isReflecting = useRef(false);
  // The last values we pushed / reflected — the value-change baseline.
  const lastSeenValues = useRef<FilterPayload>({
    ...form.store.state.values,
  });

  // Latest-props refs so the store listener (registered once) always reads the
  // current filter/setFilters without re-subscribing.
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const setFiltersRef = useRef(setFilters);
  setFiltersRef.current = setFilters;

  // Push on USER value change. Subscribe to the form store; on a values change
  // that we did NOT originate (not a reflect), treat it as a user edit: flag it
  // and SCHEDULE a push. The push is deferred to a microtask so any synchronous
  // field validation the change triggers has SETTLED `canSubmit` first — else
  // the validity gate would read the stale (pre-validation) value and let an
  // invalid filter through (the clear-a-required-field race). Multiple
  // notifications inside one edit coalesce into a single scheduled push.
  useEffect(() => {
    let scheduled = false;
    // Cleared on unmount so a microtask scheduled by the LAST keystroke does not
    // fire a zombie `setFilters` against a torn-down list controller after the
    // form is gone (the subscription is already gone, but an in-flight microtask
    // would otherwise still run).
    let cancelled = false;
    const sub = form.store.subscribe(() => {
      const values = form.store.state.values;
      if (values === lastSeenValues.current) return;
      lastSeenValues.current = values;
      if (isReflecting.current) return; // our own reset — not a user edit.
      hasJustBeenModifiedByUser.current = true;
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (cancelled) return; // unmounted before the push settled — no zombie write.
        // Read the SETTLED state at push time.
        if (!form.store.state.canSubmit) return; // validity gate (ra parity).
        setFiltersRef.current(
          mergeFilterValues(filterRef.current, form.store.state.values),
          undefined,
          true,
        );
      });
    });
    return () => {
      cancelled = true;
      sub.unsubscribe();
    };
  }, [form]);

  // Reflect EXTERNAL filter changes back into the form. Depend on the filter's
  // VALUE-KEY (`filterKey`) — the filter's reference is not stable across list
  // renders, so a reference dep would re-run every render; the value-key runs
  // the effect only on a genuine content change. `filterKey` is genuinely
  // consumed inside (the reflected-key guard), and the current filter is read
  // through `filterRef` (a stable ref) to keep the dep list honest.
  const filterKey = JSON.stringify(filter);
  const lastReflectedKey = useRef<string | null>(null);
  useEffect(() => {
    // Skip exactly one reflect after a user edit (the guard) so a stale
    // debounced value the list echoes back does not overwrite fresher input.
    if (hasJustBeenModifiedByUser.current) {
      hasJustBeenModifiedByUser.current = false;
      lastReflectedKey.current = filterKey;
      return;
    }
    if (lastReflectedKey.current === filterKey) return; // already reflected.
    lastReflectedKey.current = filterKey;
    const incoming = filterRef.current;
    const current = form.store.state.values;
    // Build the reflect shape over the UNION of current values, registered
    // fields (form-core keeps registered inputs in `fieldMeta`, NOT in `values`
    // until they hold a value), and filter keys — so a mounted-but-unset input
    // still receives the external filter value.
    const shape = filterFormReflectShape(
      current,
      form.store.state.fieldMeta,
      incoming,
    );
    const next = getFilterFormValues(shape, incoming);
    if (JSON.stringify(next) === JSON.stringify(current)) return;
    isReflecting.current = true;
    form.reset(next);
    lastSeenValues.current = form.store.state.values;
    isReflecting.current = false;
  }, [filterKey, form]);

  // Filter-flavored source scope: identity source, resource-keyed labels.
  const sourceScope = useResourceSourceScope(resource);

  return { form, sourceScope, canSubmit };
}

/* -------------------------------------------------------------------------- */
/* FilterLiveForm                                                             */
/* -------------------------------------------------------------------------- */

export interface FilterLiveFormProps extends UseFilterFormOptions {
  /** The filter inputs (`useInput`-driven) whose values drive `setFilters`. */
  children: ReactNode;
}

/**
 * A form that auto-submits its child inputs into the ambient list's filter.
 * Wrap filter inputs in it beside a `<FilterList>` or as a standalone search
 * box:
 *
 * ```tsx
 * <ListContextProvider value={list}>
 *   <FilterLiveForm>
 *     <TextInput source="title" />
 *   </FilterLiveForm>
 * </ListContextProvider>
 * ```
 */
export function FilterLiveForm({
  children,
  resource,
  debounce,
}: FilterLiveFormProps): ReactNode {
  const { form, sourceScope } = useFilterForm({ resource, debounce });
  return (
    <CheloneFormProvider form={form}>
      <FormGroupsProvider>
        <SourceContextProvider scope={sourceScope}>
          {children}
        </SourceContextProvider>
      </FormGroupsProvider>
    </CheloneFormProvider>
  );
}
