/**
 * `useWarnWhenUnsavedChanges` — the Vue twin of `@chelone/react`'s
 * `warn-unsaved-changes.tsx`. Warns the user before they leave a form with
 * unsaved changes, in two independent halves:
 *
 * 1. **Router block** (SPA navigation) on the adapter's `useBlocker`. The dirty
 *    signal is `!isDefaultValue`, NOT the sticky `isDirty` (which stays true
 *    after an edit-then-revert). A save clears the block until the next edit.
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

/** Whether `pathname` is `base` or sits under it, on a `/` boundary. */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * A path under the form root is inside the form, except `${root}/show`, which
 * counts as leaving it (ra-core parity). `/posts/12` is not under `/posts/1`.
 */
function isNavigatingAwayFromForm(
  nextPathname: string,
  formRoot: string,
): boolean {
  const root = formRoot.replace(/\/+$/, "");
  return !isUnder(nextPathname, root) || isUnder(nextPathname, `${root}/show`);
}

export function useWarnWhenUnsavedChanges(
  enable: MaybeRefOrGetter<boolean>,
  formRootPathname?: MaybeRefOrGetter<string | undefined>,
): WarnWhenUnsavedChangesDecision {
  const { form } = useCheloneFormContext();

  // `isSubmitSuccessful` is true after any submit that did not throw, including
  // one the server rejected with field errors, and form-core never clears it on
  // a later edit. So read it once, when it turns true: the save counts only if
  // the form was valid then, and only while the values are still the ones saved.
  // type-escape: context: the ambient form names no record, so its values are record-free
  let savedValues: unknown;
  let wasSubmitSuccessful = false;
  const readFormState = () => {
    const { isDefaultValue, isSubmitSuccessful, isValid, values } =
      form.ambient.store.state;
    if (!isSubmitSuccessful) savedValues = undefined;
    else if (!wasSubmitSuccessful) savedValues = isValid ? values : undefined;
    wasSubmitSuccessful = isSubmitSuccessful;
    return {
      isDefaultValue,
      isSaved: savedValues !== undefined && values === savedValues,
    };
  };
  const formState = shallowRef(readFormState());
  onScopeDispose(
    subscribeStore(form.ambient.store, () => {
      const next = readFormState();
      const current = formState.value;
      if (
        current.isDefaultValue === next.isDefaultValue &&
        current.isSaved === next.isSaved
      ) {
        return;
      }
      formState.value = next;
    }),
  );

  const shouldBlock = computed(
    () =>
      toValue(enable) &&
      !formState.value.isDefaultValue &&
      !formState.value.isSaved,
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

  // Fixed at setup, like ra-core's `initialLocation`: re-reading it per
  // navigation would move the root as the user steps between tabs of the form.
  const mountedPathname = adapter?.useLocation().value.pathname;

  const blocker =
    adapter && canBlock
      ? adapter.useBlocker(
          ({ nextLocation }: { nextLocation: CheloneLocation }) => {
            if (!shouldBlock.value) return false;
            const formRoot = toValue(formRootPathname) ?? mountedPathname;
            if (formRoot === undefined) return false;
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
