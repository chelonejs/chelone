/**
 * `useCheckForApplicationUpdate` — the Vue twin of `@chelone/react`'s hook of
 * the same name (`compat-hooks.ts`). Bridges core's
 * `createApplicationUpdateStore` through `useMicroStoreSelector`.
 */

import { createApplicationUpdateStore } from "@chelone/core";
import {
  computed,
  effectScope,
  type MaybeRef,
  type MaybeRefOrGetter,
  type Ref,
  shallowRef,
  toValue,
  unref,
  watch,
} from "vue";
import { useMicroStoreSelector } from "../store/use-micro-store";

// Bundler-replaced dev/prod flag; mirrors `feedback/error.vue`. `@chelone/vue`
// ships no `@types/node`, so a minimal ambient declaration types the reference.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

const IS_DEV =
  (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
  "production";

/** Options for {@link useCheckForApplicationUpdate}. Each may be a ref. */
export interface UseCheckForApplicationUpdateOptions {
  /** Page to fingerprint. Defaults to `${location.origin}/index.html`. */
  url?: MaybeRefOrGetter<string | undefined>;
  /** Milliseconds between checks. Defaults to one hour. */
  interval?: MaybeRefOrGetter<number | undefined>;
  /** Never fetch. Defaults to `true` outside production. */
  disabled?: MaybeRefOrGetter<boolean | undefined>;
  /** Read at each check. `cache: "no-store"` always overrides it. */
  fetchOptions?: MaybeRef<RequestInit | (() => RequestInit) | undefined>;
  /** Called once, when the first change is seen. Read at the time it fires. */
  onNewVersionAvailable?: MaybeRef<(() => void) | undefined>;
}

/**
 * `true` once the deployed page's body differs from the first one fetched, so
 * a new build is live (ra `useCheckForApplicationUpdate` parity). `disabled`
 * defaults to `true` outside production, so a dev server never polls.
 *
 * The poll restarts only when `url`, `interval` or `disabled` change:
 * `fetchOptions` and `onNewVersionAvailable` are read at each check.
 */
export function useCheckForApplicationUpdate(
  options: UseCheckForApplicationUpdateOptions = {},
): Readonly<Ref<boolean>> {
  // Boxed: `shallowRef` would otherwise unwrap a ref passed as its value.
  const current = shallowRef<{ hasNewVersion: Readonly<Ref<boolean>> }>({
    hasNewVersion: shallowRef(false),
  });

  watch(
    [
      () => toValue(options.url),
      () => toValue(options.interval),
      () => toValue(options.disabled) ?? IS_DEV,
    ],
    ([url, interval, disabled], _previous, onCleanup) => {
      // Detached: this callback runs outside any component scope, and the
      // cleanup below is what releases the store on a rebuild or disposal.
      const scope = effectScope(true);
      onCleanup(() => scope.stop());
      const hasNewVersion = scope.run(() =>
        useMicroStoreSelector(
          createApplicationUpdateStore({
            url,
            interval,
            disabled,
            fetchOptions: () => {
              const fetchOptions = unref(options.fetchOptions);
              return (
                (typeof fetchOptions === "function"
                  ? fetchOptions()
                  : fetchOptions) ?? {}
              );
            },
            onNewVersionAvailable: () =>
              unref(options.onNewVersionAvailable)?.(),
          }),
          (snapshot) => snapshot.hasNewVersion,
        ),
      );
      // `scope.run` is only `undefined` for a stopped scope, which this is not.
      if (hasNewVersion) current.value = { hasNewVersion };
    },
    { immediate: true, flush: "sync" },
  );

  return computed(() => current.value.hasNewVersion.value);
}
