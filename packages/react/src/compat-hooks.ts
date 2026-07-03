import type { DataProvider, ResourceMap } from "@chelone/core";
import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useCheloneContext } from "./context";
import { useLocale, useSetLocale } from "./i18n-hooks";

/**
 * The raw dataProvider off `<CheloneProvider>` (ra `useDataProvider` parity).
 *
 * ra-core returns a validating/logout Proxy; chelone's provider is already the
 * concrete object the app supplied (a `fakeDataProvider` or a real one), so
 * this returns it verbatim. Response-format validation and logout-on-error are
 * handled elsewhere in chelone's query pipeline, not per raw call — imperative
 * consumers (export, devtools) want the real methods, not a wrapped surface.
 */
export function useDataProvider<
  TResources extends ResourceMap = ResourceMap,
  TProvider extends DataProvider<TResources> = DataProvider<TResources>,
>(): TProvider {
  return useCheloneContext<TResources>().dataProvider as TProvider;
}

/**
 * Trigger a full page refresh (ra `useRefresh` parity). The returned callback
 * invalidates EVERY query (no filter) so the active ones refetch and any
 * component reading react-query data re-renders. Stable across renders.
 */
export function useRefresh(): () => void {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);
}

/**
 * Global data-connection state (ra `useLoading` parity): `true` while ANY query
 * or mutation is pending.
 *
 * Deliberately NOT react-query's `useIsFetching`/`useIsMutating`, which
 * re-render on every count change (too chatty). We subscribe to the query and
 * mutation caches through `notifyManager.batchCalls` and flip a single boolean
 * only on the has-work / no-work EDGE — so a loading indicator re-renders at
 * most twice per burst, not once per in-flight request.
 */
export function useLoading(): boolean {
  const client = useQueryClient();
  const mountedRef = useRef(false);
  const isFetchingRef = useRef(client.isFetching() > 0);
  const isMutatingRef = useRef(client.isMutating() > 0);

  const [isLoading, setIsLoading] = useState<boolean>(
    isFetchingRef.current || isMutatingRef.current,
  );

  useEffect(() => {
    mountedRef.current = true;

    const unsubscribeQueryCache = client.getQueryCache().subscribe(
      notifyManager.batchCalls(() => {
        if (mountedRef.current) {
          isFetchingRef.current = client.isFetching() > 0;
          setIsLoading(isFetchingRef.current || isMutatingRef.current);
        }
      }),
    );

    const unsubscribeMutationCache = client.getMutationCache().subscribe(
      notifyManager.batchCalls(() => {
        if (mountedRef.current) {
          isMutatingRef.current = client.isMutating() > 0;
          setIsLoading(isFetchingRef.current || isMutatingRef.current);
        }
      }),
    );

    // Reconcile against any work that started between initial state and effect.
    isFetchingRef.current = client.isFetching() > 0;
    isMutatingRef.current = client.isMutating() > 0;
    setIsLoading(isFetchingRef.current || isMutatingRef.current);

    return () => {
      mountedRef.current = false;
      unsubscribeQueryCache();
      unsubscribeMutationCache();
    };
  }, [client]);

  return isLoading;
}

/**
 * Current locale plus a setter (ra `useLocaleState` parity), as a
 * `[locale, setLocale]` tuple.
 *
 * ra-core backs this with the KV store; chelone's i18n instance is the source
 * of truth, so this composes the existing reactive `useLocale` (subscribes to
 * `i18n` locale changes) and `useSetLocale`. No store key, no drift — reading
 * and writing the locale both go through the one i18n instance.
 */
export function useLocaleState(): [string, (locale: string) => void] {
  const locale = useLocale();
  const setLocale = useSetLocale();
  return [locale, setLocale];
}

/** The mobile breakpoint (px). Below this width the viewport is "mobile". */
const MOBILE_BREAKPOINT = 768;

/**
 * `true` when the viewport is narrower than {@link MOBILE_BREAKPOINT}
 * (shadcn `useIsMobile` parity). SSR-safe: renders `false` on the server (no
 * `window`), then corrects on the client's first effect — matching the shadcn
 * hook's undefined-until-mounted behavior without a hydration mismatch on the
 * boolean.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
