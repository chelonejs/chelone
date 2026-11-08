/**
 * `useReferenceInput` — the Vue bridge for the VANILLA choices controller, the
 * twin of `@chelone/react`'s `useReferenceInput` (`choices-hooks.ts`). It fetches
 * a referenced resource's choices (a live list + selected-record resolution) and
 * exposes them as a {@link ChoicesContextValue} a choice input consumes through
 * {@link provideChoicesContext} + {@link useChoicesContext}.
 *
 * Idiom translation from the React twin: React holds the controller in `useState`
 * (constructed once), bridges it with `useSyncExternalStore`, and re-derives the
 * `ChoicesContextValue` object per render via `useMemo(snapshot)`. Vue constructs
 * the controller once in `setup`, bridges it with {@link useMicroStore} (the MicroStore
 * reactivity seam — subscribe drives the 4R acquire, `onScopeDispose` releases),
 * and returns ONE object whose data fields are GETTERS over the store ref, so a
 * plain property read tracks the store exactly where a consumer reads it. The
 * action verbs delegate straight to the controller.
 *
 * `ctx`/`options` are read once at construction (parity with the React twin's
 * `useState` capture) — remount the input to change the reference/options.
 */

import type {
  ChoiceRecord,
  ChoicesController,
  ChoicesControllerContext,
  ChoicesControllerOptions,
  ResourceMap,
} from "@chelone/core";
import {
  choiceListsOf,
  createChoicesController,
  eraseChoicesController,
} from "@chelone/core";
import { type CheloneContextValue, useCheloneContext } from "../context";
import { useMicroStore } from "../store/use-micro-store";
import type { ChoicesContextValue } from "./choices-context";

/** `useReferenceInput` options: the controller options (the ctx is injected). */
export type UseReferenceInputOptions<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
> = ChoicesControllerOptions<TResources, TName>;

/** The reference-input result — the live choices context plus its actions. */
export type UseReferenceInputResult = ChoicesContextValue;

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

/**
 * Vue bridge for the vanilla choices controller (reference input). Constructs
 * the controller INERTLY, then {@link useMicroStore} subscribes on `setup` (the 4R
 * acquire — both QueryObservers attach) and releases on scope disposal.
 *
 * Returns a {@link ChoicesContextValue} whose data fields are reactive getters
 * over the controller store; pass it to {@link provideChoicesContext} so a choice
 * input reads it via {@link useChoicesContext}.
 */
export function useReferenceInput<
  TResources extends ResourceMap = ResourceMap,
  TName extends keyof TResources & string = keyof TResources & string,
>(
  options: UseReferenceInputOptions<TResources, TName>,
): UseReferenceInputResult {
  const ctx = useCheloneContext<TResources>();

  const controller: ChoicesController<ChoiceRecord> = eraseChoicesController(
    createChoicesController<TResources, TName>(toChoicesContext(ctx), options),
  );

  // Bridge + 4R: subscribe on setup (acquire both observers), release on
  // scope disposal. `state.value` is the reactive controller snapshot.
  const state = useMicroStore(controller);

  // Getters make each property read track `state.value` at the consumer's read
  // site — the Vue analog of React re-deriving the object per render. Core's
  // `choiceListsOf` is where a record becomes an erased `ChoiceRecord`.
  return {
    get allChoices() {
      return choiceListsOf(state.value).allChoices;
    },
    get availableChoices() {
      return choiceListsOf(state.value).availableChoices;
    },
    get selectedChoices() {
      return choiceListsOf(state.value).selectedChoices;
    },
    get total() {
      return state.value.total;
    },
    get isPending() {
      return state.value.isPending;
    },
    get isFetching() {
      return state.value.isFetching;
    },
    get error() {
      return state.value.error;
    },
    get page() {
      return state.value.page;
    },
    get perPage() {
      return state.value.perPage;
    },
    get sort() {
      return state.value.sort;
    },
    get filter() {
      return state.value.filter;
    },
    get hasNextPage() {
      return state.value.hasNextPage;
    },
    get hasPreviousPage() {
      return state.value.hasPreviousPage;
    },
    get resource() {
      return state.value.resource;
    },
    get source() {
      return state.value.source;
    },
    isFromReference: true,
    setPage: controller.setPage,
    setPerPage: controller.setPerPage,
    setSort: controller.setSort,
    setFilters: controller.setFilters,
    setValue: controller.setValue,
    refetch: controller.refetch,
  };
}
