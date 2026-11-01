import {
  type ApplicationUpdateStoreOptions,
  createApplicationUpdateStore,
  createOfflineStore,
  type DataProvider,
  type ResourceMap,
} from "@chelone/core";
import { notifyManager, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useCheloneContext } from "./context";
import { useLocale, useSetLocale } from "./i18n-hooks";
import { useEvent } from "./util/use-event";

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

/**
 * The locales the i18n instance registers, each named in its own language
 * ("Deutsch", not "German") so a user lost in the wrong language can find theirs.
 *
 * `getLocales()` returns bare codes. A code `Intl` rejects keeps the code as its
 * name. Without an i18n instance the list is empty rather than throwing, so
 * `<AppBar>` keeps rendering in an app that never passed one.
 */
export function useLocales(): { locale: string; name: string }[] {
  const i18n = useCheloneContext().i18n;
  return useMemo(
    () =>
      (i18n?.getLocales() ?? []).map((locale) => ({
        locale,
        name: localeName(locale),
      })),
    [i18n],
  );
}

function localeName(locale: string): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? locale
    );
  } catch {
    return locale;
  }
}

/**
 * Returns `false`, then flips to `true` once `delay` ms have elapsed since the
 * timer (re)started (ra `useTimeout` parity). The timer restarts whenever
 * `delay` or any entry of `dependencies` changes; `dependencies` defaults to a
 * stable empty array (fires once on mount). Used to defer loading UI — the
 * spinner/progress bar only appears after a short grace period so a fast
 * response never flashes it.
 */
export function useTimeout(delay = 0, dependencies: unknown[] = []): boolean {
  const [ready, setReady] = useState(false);

  // `dependencies` is the caller-supplied reset key (ra `useTimeout` contract):
  // spreading it (plus `delay`) into the dep array re-arms the timer whenever
  // any entry changes. This is the intended, contract-driven dep list.
  useEffect(() => {
    setReady(false);
    const timer = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(timer);
  }, [delay, ...dependencies]);

  return ready;
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

/**
 * `true` while the browser reports itself offline. Reads `navigator.onLine` on
 * the client, so a page opened offline is offline from the first render; the
 * server snapshot is `false` (no `navigator` to ask).
 */
export function useIsOffline(): boolean {
  const store = useMemo(() => createOfflineStore(), []);
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().isOffline,
    () => false,
  );
}

// Bundler-replaced dev/prod flag; mirrors `feedback/error.tsx`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

const IS_DEV =
  (typeof process !== "undefined" ? process.env?.NODE_ENV : undefined) !==
  "production";

/**
 * `true` once the deployed page's body differs from the first one fetched, so
 * a new build is live (ra `useCheckForApplicationUpdate` parity). `disabled`
 * defaults to `true` outside production, so a dev server never polls.
 *
 * The poll restarts only when `url`, `interval` or `disabled` change:
 * `fetchOptions` and `onNewVersionAvailable` are read at each use, so an
 * inline object or callback is safe.
 */
export function useCheckForApplicationUpdate(
  options: ApplicationUpdateStoreOptions = {},
): boolean {
  const { url, interval, disabled = IS_DEV } = options;
  const readFetchOptions = useEvent(() => {
    const { fetchOptions } = options;
    return (
      (typeof fetchOptions === "function" ? fetchOptions() : fetchOptions) ?? {}
    );
  });
  const onNewVersionAvailable = useEvent(() => {
    options.onNewVersionAvailable?.();
  });
  const store = useMemo(
    () =>
      createApplicationUpdateStore({
        url,
        interval,
        disabled,
        fetchOptions: readFetchOptions,
        onNewVersionAvailable,
      }),
    [url, interval, disabled, readFetchOptions, onNewVersionAvailable],
  );
  return useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().hasNewVersion,
    () => false,
  );
}
