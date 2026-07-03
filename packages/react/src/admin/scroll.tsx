/**
 * Scroll behavior for the shell (plan §0a-14, W1-T7).
 *
 * Two complementary pieces, both SSR-safe (every `window` touch is guarded):
 *
 * - `useScrollToTop` — after a navigation whose location `state` carries
 *   `_scrollToTop === true` (set by `useRedirect` for every intent EXCEPT
 *   `'list'`), scroll the window to the top. A list restores its own scroll
 *   instead (see `RestoreScrollPosition`), so it never sets `_scrollToTop`.
 *
 * - `RestoreScrollPosition` — per-list scroll memory. While mounted it tracks
 *   `window.scrollY` under a Store key (debounced 250ms so a scroll burst writes
 *   once), and on mount restores the last saved position — UNLESS the navigation
 *   that brought us here set `_scrollToTop` (an explicit "go to top" wins over a
 *   remembered position). Store-backed so the memory survives unmount/remount
 *   (navigating away from and back to a list).
 */

import { useEffect, useRef } from "react";
import { useChelonStore } from "../context";
import { useLocation } from "../router/nav-hooks";

/** How the location `state` carries the scroll intent (set by `useRedirect`). */
interface ScrollState {
  _scrollToTop?: boolean;
}

/** Read `_scrollToTop` off a location state, tolerating any/absent shape. */
function scrollToTopRequested(state: unknown): boolean {
  return (state as ScrollState | null)?._scrollToTop === true;
}

/**
 * Scroll to the top of the window after a navigation flagged `_scrollToTop`
 * (plan §0a-14). Keyed on `location.key` so it re-fires per distinct navigation
 * (two navigations to the same path both scroll), and on the flag so a list
 * navigation (no flag) does not. SSR-safe: no-op when `window` is absent.
 */
export function useScrollToTop(): void {
  const location = useLocation();
  const wantsTop = scrollToTopRequested(location.state);
  // `location.key` distinguishes otherwise-identical navigations so re-visiting
  // the same path still scrolls. It may be undefined under some adapters; the
  // pathname is a stable fallback.
  const key = location.key ?? location.pathname;

  // `key` is a DELIBERATE re-fire trigger: two navigations to the SAME path that
  // both request the top must both scroll, which `wantsTop` alone (stable across
  // them) would miss. Biome sees `key` as "extra" because the body does not read
  // it — the suppression is exact.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the intentional per-navigation re-fire trigger; the body reads only `wantsTop`.
  useEffect(() => {
    if (!wantsTop) return;
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
  }, [wantsTop, key]);
}

/** The Store key a list's remembered scroll position lives under. */
function scrollKey(storeKey: string): string {
  return `scrollPosition.${storeKey}`;
}

export interface RestoreScrollPositionProps {
  /**
   * A stable per-list key (typically the resource name + a list identity) the
   * remembered position is stored under. Distinct lists use distinct keys so
   * their scroll memories never collide.
   */
  storeKey: string;
  /** Debounce (ms) for persisting the scroll position. Default 250 (plan §0a-14). */
  debounce?: number;
  children?: React.ReactNode;
}

/**
 * Track + restore a list's scroll position across unmount/remount (plan §0a-14).
 *
 * On mount: restore the saved `window.scrollY` for `storeKey` UNLESS the
 * navigation that mounted us set `_scrollToTop` (explicit "go to top" wins). A
 * scroll listener persists `window.scrollY` under the Store key, debounced by
 * `debounce` (default 250ms) so a scroll burst writes once. Store-backed, so
 * the memory survives navigating away and back.
 *
 * SSR-safe: the effects are client-only (no `window` at import); on the server
 * the component simply renders its children.
 */
export function RestoreScrollPosition({
  storeKey,
  debounce = 250,
  children,
}: RestoreScrollPositionProps): React.ReactNode {
  const store = useChelonStore();
  const location = useLocation();
  const wantsTop = scrollToTopRequested(location.state);
  const key = scrollKey(storeKey);

  // Latest-ref the volatile inputs so the mount/scroll effect depends only on
  // the stable identity (store + key), never re-running on a location change.
  const wantsTopRef = useRef(wantsTop);
  wantsTopRef.current = wantsTop;
  const debounceRef = useRef(debounce);
  debounceRef.current = debounce;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Restore on mount unless this navigation explicitly wants the top.
    if (!wantsTopRef.current) {
      const saved = store.getItem<number>(key);
      if (typeof saved === "number") window.scrollTo(0, saved);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        store.setItem<number>(key, window.scrollY);
      }, debounceRef.current);
    };
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [store, key]);

  return children;
}
