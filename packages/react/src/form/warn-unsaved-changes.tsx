/**
 * `warnWhenUnsavedChanges` — the P5 form leftover unblocked by the P6 router
 * (plan §0c item 2, D6b, W2-T3). Warns the user before they navigate away from a
 * form with unsaved changes. Two independent halves:
 *
 * 1. **Router block** (SPA navigation) — gated on the P6 router's
 *    `useBlocker` / `useCanBlock`. The dirty signal is `!isDefaultValue` (the
 *    form-context deep-equality baseline check), NOT the sticky `isDirty`
 *    (which stays true after an edit-then-revert). A successful submit clears
 *    the block via `isSubmitSuccessful` (covers the redirect-in-onSuccess
 *    same-tick race, ra-core parity) and the post-save reset (which
 *    re-baselines `isDefaultValue`).
 *
 * 2. **`beforeunload`** (tab close / hard nav / reload) — pure DOM, shipped
 *    UNCONDITIONALLY (no router involved). Registered on every render; the
 *    listener body only calls `preventDefault` when there are unsaved changes.
 *
 * The confirm UI is shadcn-native in P7 — this hook keeps the LOGIC headless,
 * returning `{ isBlocked, proceed, cancel }`. When the host router cannot block
 * (an app wrapping `<Admin>` in a DECLARATIVE `<BrowserRouter>` — the P6 router
 * `useBlocker` THROWS there, W1-T3 finding A2), the hook NO-OPS the router half
 * and warns once (ra-core behavior: warn + disable, never throw). The
 * `beforeunload` half still works in that case.
 */

import type { CheloneLocation } from "@chelone/core";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef } from "react";
import { useCheloneFormContext } from "../form-context";
import type { RouterBlocker } from "../router/adapter";
import { useBlocker, useCanBlock } from "../router/nav-hooks";

/** The headless decision `useWarnWhenUnsavedChanges` returns. */
export interface WarnWhenUnsavedChangesDecision {
  /** True while a navigation is blocked awaiting the user's confirm/cancel. */
  isBlocked: boolean;
  /** Confirm: discard changes and continue the blocked navigation. No-op unless blocked. */
  proceed: () => void;
  /** Cancel: stay on the form, keep the changes. No-op unless blocked. */
  cancel: () => void;
}

/** An inert decision — never blocks, both actions are no-ops. */
const INERT_DECISION: WarnWhenUnsavedChangesDecision = {
  isBlocked: false,
  proceed: () => {},
  cancel: () => {},
};

/**
 * The inside-form predicate (ra-core parity, plan §0c-2): a navigation to a
 * location that is INSIDE the form (its pathname starts with the form root) is
 * ALLOWED, except the `${root}/show` view which is treated as leaving the form.
 * A navigation OUTSIDE the form root is BLOCKED (when there are unsaved
 * changes).
 */
function isNavigatingAwayFromForm(
  nextPathname: string,
  formRoot: string,
): boolean {
  const insideForm = nextPathname.startsWith(formRoot);
  const isShowView = nextPathname.startsWith(`${formRoot}/show`);
  // Away = not inside the form, OR the show view (which leaves the form).
  return !insideForm || isShowView;
}

/** The neutral-location predicate `useBlocker` receives. */
type BlockPredicate = (args: {
  currentLocation: CheloneLocation;
  nextLocation: CheloneLocation;
}) => boolean;

/** Build the inside-form block predicate (stable identity is the caller's job). */
function makeBlockPredicate(
  shouldBlockNav: boolean,
  formRootPathname: string | undefined,
): BlockPredicate {
  return ({ currentLocation, nextLocation }) => {
    if (!shouldBlockNav) return false;
    const formRoot = formRootPathname ?? currentLocation.pathname;
    return isNavigatingAwayFromForm(nextLocation.pathname, formRoot);
  };
}

/**
 * Register the `beforeunload` handler unconditionally (pure DOM). The listener
 * reads `shouldBlockRef` at fire time so a single stable listener always sees
 * the latest dirty/enabled state without re-registering per keystroke.
 */
function useBeforeUnload(shouldBlockRef: React.RefObject<boolean>): void {
  useEffect(() => {
    const beforeunload = (event: BeforeUnloadEvent) => {
      if (!shouldBlockRef.current) return;
      // preventDefault + a truthy returnValue triggers the browser's native
      // "unsaved changes" prompt (legacy support: returnValue for Chrome/Edge
      // < 119). https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", beforeunload);
    return () => window.removeEventListener("beforeunload", beforeunload);
  }, [shouldBlockRef]);
}

/**
 * Warn the user before navigating away from a form with unsaved changes.
 *
 * @param enable Master switch — `false` disables both halves.
 * @param formRootPathname The form's route root; navigations inside it (except
 *   `${root}/show`) are allowed. Defaults to the current pathname at block time.
 * @returns A headless `{ isBlocked, proceed, cancel }` decision (the confirm UI
 *   is a P7 shadcn concern).
 */
export function useWarnWhenUnsavedChanges(
  enable: boolean,
  formRootPathname?: string,
): WarnWhenUnsavedChangesDecision {
  const { form } = useCheloneFormContext();

  // Dirty = `!isDefaultValue` (deep-equality baseline), NOT the sticky
  // `isDirty` (ground truth #7). `isSubmitSuccessful` clears the block after a
  // successful save (ra-core parity: the redirect-in-onSuccess same-tick race).
  const isDefaultValue = useSelector(form.store, (s) => s.isDefaultValue);
  const justSubmitted = useSelector(form.store, (s) => s.isSubmitSuccessful);
  const dirty = !isDefaultValue;
  const shouldBlockNav = enable && dirty && !justSubmitted;

  // A single stable ref the beforeunload listener reads at fire time.
  const shouldBlockRef = useRef(shouldBlockNav);
  shouldBlockRef.current = shouldBlockNav;
  useBeforeUnload(shouldBlockRef);

  const canBlock = useCanBlock();

  // Warn ONCE (per mount) when router blocking is unavailable — ra-core
  // behavior: warn + disable, never throw. Only meaningful when the caller
  // actually wanted to block (enable).
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!canBlock && enable && !warnedRef.current) {
      warnedRef.current = true;
      console.warn(
        "useWarnWhenUnsavedChanges: the host router cannot block navigation " +
          "(no data router present). SPA-navigation warnings are disabled; " +
          "the beforeunload (tab-close) warning still applies. Mount <Admin> " +
          "under Chelone's router, or a react-router data router, to enable it.",
      );
    }
  }, [canBlock, enable]);

  // Gate the router blocker on `canBlock` (plan W2-T3): the adapter's
  // `useBlocker` THROWS under a declarative host (W1-T3 finding A2), so it MUST
  // NOT be called there. `canBlock` derives from the data-router context, which
  // is MOUNT-STABLE — it can only change across a full remount of this subtree,
  // never between two renders of the same mounted component. That is precisely
  // the case where a conditional hook call preserves hook order on every render
  // (the same guarantee react-router's ecosystem relies on for blocker
  // availability), so the `useHookAtTopLevel` rule is safe to suppress HERE.
  const predicate = makeBlockPredicate(shouldBlockNav, formRootPathname);
  let blocker: RouterBlocker | null = null;
  // biome-ignore lint/correctness/useHookAtTopLevel: canBlock is mount-stable — see the doc block + W1-T3 finding A2.
  if (canBlock) blocker = useBlocker(predicate);

  if (!blocker) return INERT_DECISION;
  return {
    isBlocked: blocker.state === "blocked",
    proceed: blocker.proceed,
    cancel: blocker.reset,
  };
}
