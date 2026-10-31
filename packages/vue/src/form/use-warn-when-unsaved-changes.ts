/**
 * `useWarnWhenUnsavedChanges` — the Vue twin of `@chelone/react`'s
 * `warn-unsaved-changes.tsx`. Warns the user before they leave a form with
 * unsaved changes, in two independent halves:
 *
 * 1. **Router block** (SPA navigation) on the adapter's `useBlocker`. The dirty
 *    signal is `!isDefaultValue`, NOT the sticky `isDirty` (which stays true
 *    after an edit-then-revert). `isSubmitSuccessful` clears the block after a
 *    save, covering the redirect-in-onSuccess same-tick race.
 * 2. **`beforeunload`** (tab close / reload) — pure DOM, so it works without a
 *    router.
 *
 * Without a `RouterAdapter` above, or when the adapter cannot block, the router
 * half is inert and the hook warns once; `beforeunload` still works.
 */

import type { CheloneLocation } from "@chelone/core";
import {
  computed,
  type MaybeRefOrGetter,
  onScopeDispose,
  type Ref,
  shallowRef,
  toValue,
  watchEffect,
} from "vue";
import { useRouterAdapterOptional } from "../router/adapter";
import { useCheloneFormContext } from "./form-context";
import { subscribeStore } from "./subscribe-ref";

/** The headless decision `useWarnWhenUnsavedChanges` returns. */
export interface WarnWhenUnsavedChangesDecision {
  /** True while a navigation is blocked awaiting the user's confirm/cancel. */
  isBlocked: Readonly<Ref<boolean>>;
  /** Confirm: discard changes and continue the blocked navigation. No-op unless blocked. */
  proceed: () => void;
  /** Cancel: stay on the form, keep the changes. No-op unless blocked. */
  cancel: () => void;
}

/**
 * A path under the form root is inside the form, except `${root}/show`, which
 * counts as leaving it (ra-core parity).
 */
function isNavigatingAwayFromForm(
  nextPathname: string,
  formRoot: string,
): boolean {
  const insideForm = nextPathname.startsWith(formRoot);
  const isShowView = nextPathname.startsWith(`${formRoot}/show`);
  return !insideForm || isShowView;
}

export function useWarnWhenUnsavedChanges(
  enable: MaybeRefOrGetter<boolean>,
  formRootPathname?: MaybeRefOrGetter<string | undefined>,
): WarnWhenUnsavedChangesDecision {
  const { form } = useCheloneFormContext();

  const formState = shallowRef({
    isDefaultValue: form.store.state.isDefaultValue,
    isSubmitSuccessful: form.store.state.isSubmitSuccessful,
  });
  onScopeDispose(
    subscribeStore(form.store, () => {
      const { isDefaultValue, isSubmitSuccessful } = form.store.state;
      const current = formState.value;
      if (
        current.isDefaultValue === isDefaultValue &&
        current.isSubmitSuccessful === isSubmitSuccessful
      ) {
        return;
      }
      formState.value = { isDefaultValue, isSubmitSuccessful };
    }),
  );

  const shouldBlock = computed(
    () =>
      toValue(enable) &&
      !formState.value.isDefaultValue &&
      !formState.value.isSubmitSuccessful,
  );

  if (typeof window !== "undefined") {
    const beforeunload = (event: BeforeUnloadEvent) => {
      if (!shouldBlock.value) return;
      // preventDefault plus a truthy returnValue raises the native prompt;
      // returnValue covers Chrome/Edge before 119.
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", beforeunload);
    onScopeDispose(() =>
      window.removeEventListener("beforeunload", beforeunload),
    );
  }

  const adapter = useRouterAdapterOptional();
  const canBlock = adapter?.useCanBlock() ?? false;

  let warned = false;
  watchEffect(() => {
    if (canBlock || warned || !toValue(enable)) return;
    warned = true;
    console.warn(
      "useWarnWhenUnsavedChanges: no router that can block navigation is " +
        "available. SPA-navigation warnings are disabled; the beforeunload " +
        "(tab-close) warning still applies. Mount <Admin> under Chelone's " +
        "router to enable it.",
    );
  });

  const blocker =
    adapter && canBlock
      ? adapter.useBlocker(
          ({
            currentLocation,
            nextLocation,
          }: {
            currentLocation: CheloneLocation;
            nextLocation: CheloneLocation;
          }) => {
            if (!shouldBlock.value) return false;
            const formRoot =
              toValue(formRootPathname) ?? currentLocation.pathname;
            return isNavigatingAwayFromForm(nextLocation.pathname, formRoot);
          },
        )
      : null;

  return {
    isBlocked: computed(() => blocker?.state.value === "blocked"),
    proceed: () => blocker?.proceed(),
    cancel: () => blocker?.reset(),
  };
}
