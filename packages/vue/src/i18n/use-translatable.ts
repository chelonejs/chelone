/**
 * `useTranslatable` and the translatable context — the Vue bridge for core's
 * `createTranslatableController`. The selected locale is a readonly ref fed by
 * the controller's `subscribe`, so anything that reads it re-evaluates on
 * `selectLocale`. A translatable form calls `provideTranslatable` and each
 * translatable input or field below it reads `useTranslatableContext`.
 */

import {
  createTranslatableController,
  getRecordForLocale as pickLocale,
  type TranslatableController,
} from "@chelone/core";
import {
  computed,
  type InjectionKey,
  inject,
  type MaybeRefOrGetter,
  onScopeDispose,
  provide,
  type Ref,
  shallowRef,
  toValue,
  watch,
} from "vue";
import { useLocale } from "./use-locale";

export interface UseTranslatableOptions {
  /**
   * Rebuilds the controller when its entries change, not when the array does.
   * Changing to an empty list is rejected as at setup, but a watcher cannot
   * throw to the caller: Vue reports the error and the previous locales stay.
   */
  locales: MaybeRefOrGetter<readonly string[]>;
  /**
   * Ignored when it is not one of `locales`. Without it the start locale is the
   * app locale when listed, else the first locale.
   */
  defaultLocale?: MaybeRefOrGetter<string | undefined>;
}

export interface TranslatableContext {
  /** The current locales; a getter, so it follows a change of `locales`. */
  readonly locales: readonly string[];
  readonly selectedLocale: Readonly<Ref<string>>;
  /** Throws when `locale` is not one of `locales`. */
  selectLocale(locale: string): void;
  /** `record` with each translation map replaced by its selected-locale value. */
  getRecordForLocale<T extends object | null | undefined>(
    record: T,
  ): T extends object ? Record<string, unknown> : T;
}

const TranslatableKey: InjectionKey<TranslatableContext> = Symbol(
  "chelone-translatable",
);

export function useTranslatable(
  options: UseTranslatableOptions,
): TranslatableContext {
  const appLocale = useLocale();

  function build(preferred: string | undefined): TranslatableController {
    const locales = toValue(options.locales);
    const defaultLocale = toValue(options.defaultLocale);
    const start = [preferred, defaultLocale, appLocale.value].find(
      (locale) => locale !== undefined && locales.includes(locale),
    );
    return createTranslatableController({ locales, defaultLocale: start });
  }

  let controller = build(undefined);
  let release = () => {};
  const state = shallowRef(controller.getSnapshot());

  function attach(next: TranslatableController) {
    release();
    controller = next;
    state.value = next.getSnapshot();
    release = next.subscribe(() => {
      state.value = next.getSnapshot();
    });
  }
  attach(controller);

  watch(
    () => JSON.stringify(toValue(options.locales)),
    () => {
      const previous = controller;
      attach(build(previous.getSnapshot().selectedLocale));
      previous.destroy();
    },
    { flush: "sync" },
  );

  onScopeDispose(() => {
    release();
    controller.destroy();
  });

  const selectedLocale = computed(() => state.value.selectedLocale);

  return {
    get locales() {
      return state.value.locales;
    },
    selectedLocale,
    selectLocale: (locale) => controller.selectLocale(locale),
    getRecordForLocale: (record) =>
      pickLocale(record, state.value.selectedLocale, state.value.locales),
  };
}

export function provideTranslatable(context: TranslatableContext): void {
  provide(TranslatableKey, context);
}

/** The context a translatable form provided. Throws outside one. */
export function useTranslatableContext(): TranslatableContext {
  const context = inject(TranslatableKey, undefined);
  if (!context) {
    throw new Error(
      "useTranslatableContext must be used under a component that calls provideTranslatable",
    );
  }
  return context;
}
