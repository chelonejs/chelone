/**
 * R2 permissions / access composables — the Vue twin of the React adapter's
 * `usePermissions` / `useLogoutIfAccessDenied` / `useWatchDataErrors`
 * (`@chelone/react`'s `auth-hooks.ts`). Each wraps the additive, framework-
 * agnostic core pieces (`permissionsQueryOptions` / `checkError`) around the
 * ambient `authProvider`, reusing the SAME vue-query client `<Admin>` installs.
 *
 * Idiom translation from the React twin: React re-derives its result object each
 * render and runs the data-error subscription in a `useEffect`; Vue returns
 * `ComputedRef`s off the vue-query result refs (template-reactive) and runs the
 * cache subscription in `setup` with an `onScopeDispose` teardown.
 */

import { checkError, permissionsQueryOptions } from "@chelone/core";
import {
  type QueryKey,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { type ComputedRef, computed, onScopeDispose } from "vue";
import { useCheloneContext } from "../context";
import { type Redirect, useRedirectOptional } from "../router";

/* -------------------------------------------------------------------------- */
/* usePermissions                                                             */
/* -------------------------------------------------------------------------- */

/** The result of {@link usePermissions} (reactive refs). */
export interface UsePermissionsResult<PermissionsType = unknown> {
  /** The current user's permissions (`undefined` until resolved / unconfigured). */
  permissions: ComputedRef<PermissionsType | undefined>;
  /** Whether the permissions query is in flight (always `false` when unconfigured). */
  isPending: ComputedRef<boolean>;
  /** The error, if the provider's `getPermissions` rejected. */
  error: ComputedRef<Error | null>;
  /** Re-run the permissions query. */
  refetch: () => void;
}

/** Options for {@link usePermissions}. */
export interface UsePermissionsOptions {
  /** Query stale time (ms). Defaults to 5 minutes. */
  staleTime?: number;
  /** Disable the query entirely (default `true`). */
  enabled?: boolean;
}

/**
 * Fetch the current user's permissions via `authProvider.getPermissions`
 * (R2 parity with ra-core's `usePermissions`). Undefined-tolerant and no-throw:
 *
 * - No `authProvider`, or no `getPermissions` on it → `{ permissions: undefined,
 *   isPending: false }` (access control / permissions not configured).
 * - Otherwise wraps {@link permissionsQueryOptions} via vue-query.
 *
 * Unlike {@link useCanAccess}/{@link useGetIdentity} (which THROW without a
 * provider), this degrades gracefully so a no-auth app can call it to gate
 * optional features.
 */
export function usePermissions<PermissionsType = unknown>(
  params?: unknown,
  options: UsePermissionsOptions = {},
): UsePermissionsResult<PermissionsType> {
  const { authProvider } = useCheloneContext();
  const hasGetPermissions = authProvider?.getPermissions != null;
  const query = useQuery({
    ...permissionsQueryOptions(
      // A stub provider satisfies the option factory's type when none is
      // configured; the query is disabled in that case so it never runs.
      authProvider ?? ({} as NonNullable<typeof authProvider>),
      params,
    ),
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    enabled: (options.enabled ?? true) && hasGetPermissions,
  });

  return {
    // No provider / no getPermissions → permissions not configured. Vue-query
    // reports a disabled query as `isPending: true` (fetchStatus idle); the
    // undefined-tolerant contract must win over that.
    permissions: computed(() =>
      hasGetPermissions
        ? (query.data.value as PermissionsType | undefined)
        : undefined,
    ),
    isPending: computed(() =>
      hasGetPermissions ? query.isPending.value : false,
    ),
    error: computed(() => (hasGetPermissions ? query.error.value : null)),
    refetch: () => {
      void query.refetch();
    },
  };
}

/* -------------------------------------------------------------------------- */
/* useLogoutIfAccessDenied + data-error wiring                               */
/* -------------------------------------------------------------------------- */

/** The default path a logged-out session is redirected to. */
const DEFAULT_LOGIN_PATH = "/login";

/**
 * Module-level debounce (mirrors ra-core + the React twin): side-effects fire at
 * most once per tick, so a burst of simultaneously-erroring queries does not
 * trigger a stack of logouts / notifications in the same pass.
 */
let logoutTimer: ReturnType<typeof setTimeout> | undefined;

/** Navigate after a logout: absolute URLs hard-navigate, paths use the router. */
function handleRedirect(redirect: Redirect, url: string): void {
  if (url.startsWith("http") && typeof window !== "undefined") {
    window.location.href = url;
  } else {
    // Function form navigates the raw path verbatim (basename-prefixed).
    redirect(() => url);
  }
}

/** The callback returned by {@link useLogoutIfAccessDenied}. */
export type LogoutIfAccessDenied = (error?: unknown) => Promise<boolean>;

/**
 * Returns a callback that runs `authProvider.checkError(error)` against a
 * data/mutation error and, if the session is invalid (checkError REJECTS), logs
 * the user out, notifies, and redirects to the login page (R2 parity with
 * ra-core's `useLogoutIfAccessDenied`).
 *
 * Fail-safe by construction:
 * - No `authProvider` → no-op, resolves `false`.
 * - checkError RESOLVES (an ordinary data error) → no-op, resolves `false`.
 * - checkError REJECTS → logout + notify + redirect, resolves `true`. Only an
 *   auth rejection ever logs the user out; ordinary data errors never do.
 *
 * The reject payload's hints (`redirectTo`, `logoutUser`, `message`) are honored
 * via the vanilla core {@link checkError} triage: `logoutUser: false` downgrades
 * to a "not authorized" notice + optional redirect without ending the session;
 * `message: false` suppresses the notification.
 */
export function useLogoutIfAccessDenied(): LogoutIfAccessDenied {
  const { authProvider, notifications } = useCheloneContext();
  // A tolerant logout mutation: `useLogout()` throws without an authProvider, but
  // this hook must be safe to mount in a no-auth app (the data-error watcher
  // calls it unconditionally). Inline the mutation so no throw occurs.
  const logout = useMutation({
    mutationFn: (params?: unknown) =>
      authProvider?.logout(params) ?? Promise.resolve(),
  });
  const redirect = useRedirectOptional();

  return async (error) => {
    if (!authProvider) return false;
    const outcome = await checkError(authProvider, error);
    if (!outcome.logout) return false;

    // Debounce: at most one logout side-effect burst per tick.
    if (logoutTimer) return true;
    logoutTimer = setTimeout(() => {
      logoutTimer = undefined;
    }, 0);

    const { logoutUser, redirectTo, message } = outcome;
    const isHttpRedirect = redirectTo?.startsWith("http") ?? false;
    const shouldNotify = message !== false && !isHttpRedirect;
    if (shouldNotify && notifications) {
      notifications.notify(
        typeof message === "string"
          ? message
          : logoutUser
            ? "chelone.notification.logged_out"
            : "chelone.notification.not_authorized",
        { type: "error" },
      );
    }

    if (logoutUser) {
      logout.mutate(redirectTo != null ? { redirectTo } : undefined);
      handleRedirect(redirect, redirectTo ?? DEFAULT_LOGIN_PATH);
    } else if (redirectTo) {
      handleRedirect(redirect, redirectTo);
    }
    return true;
  };
}

/** True when a vue-query key belongs to the auth subsystem (`["auth", …]`). */
function isAuthQueryKey(key: QueryKey): boolean {
  return Array.isArray(key) && key[0] === "auth";
}

/**
 * Wire `checkError` → auto-logout into the DATA ERROR PATH (R2). Subscribes to
 * the shared QueryClient's query + mutation caches and, on every settled error,
 * runs {@link useLogoutIfAccessDenied} — so a 401/403 surfaced by the
 * dataProvider auto-logs-out (checkError rejects) while an ordinary data error is
 * left alone (checkError resolves).
 *
 * Auth-subsystem queries (`["auth", …]` — checkAuth / canAccess / getIdentity /
 * getPermissions) are skipped to avoid feedback loops. A no-op without an
 * `authProvider`. Mounted once by `<AdminShell>` (inside `<Admin>`'s context).
 */
export function useWatchDataErrors(): void {
  const queryClient = useQueryClient();
  const { authProvider } = useCheloneContext();
  const logoutIfAccessDenied = useLogoutIfAccessDenied();

  if (!authProvider) return;

  const queryCache = queryClient.getQueryCache();
  const mutationCache = queryClient.getMutationCache();

  const unsubQueries = queryCache.subscribe((event) => {
    if (event.type !== "updated") return;
    if (event.action.type !== "error") return;
    if (isAuthQueryKey(event.query.queryKey)) return;
    void logoutIfAccessDenied(event.action.error);
  });
  const unsubMutations = mutationCache.subscribe((event) => {
    if (event.type !== "updated") return;
    if (event.action.type !== "error") return;
    void logoutIfAccessDenied(event.action.error);
  });

  onScopeDispose(() => {
    unsubQueries();
    unsubMutations();
  });
}
