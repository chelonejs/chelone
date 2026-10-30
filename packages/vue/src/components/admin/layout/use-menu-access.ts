/**
 * `useMenuAccess` — a no-throw `useCanAccess` for the sidebar menu + the CRUD
 * action buttons. The Vue twin of `@chelone/react`'s
 * `layout/use-menu-access.ts`.
 *
 * Chelone's `useCanAccess` calls `useCheloneAuthProvider()`, which THROWS when no
 * `authProvider` is configured. A no-auth app must still render its resource menu
 * + buttons, so this reads the provider OPTIONALLY (`useCheloneContext`) and only
 * runs the access query when a provider WITH a `canAccess` method exists. With no
 * provider — or no `canAccess` method — access is ALLOWED (ra-core parity:
 * "access control not configured = allow").
 *
 * Vue idiom translation from the React twin: React re-derives `{ canAccess,
 * isPending }` each render; Vue returns `ComputedRef`s off the vue-query result
 * refs so a button/menu template re-renders reactively as the check settles. The
 * `params` are accepted as a `MaybeRefOrGetter` so a record-scoped grant
 * re-evaluates when an async-loading `<Show>`/`<Edit>` record flows in — the
 * query options are wrapped in a `computed` so vue-query re-subscribes on a new
 * queryKey (the reactive-options pattern), matching how the React twin re-keys on
 * a changed `record` prop.
 */

import { type CanAccessParams, canAccessQueryOptions } from "@chelone/core";
import { useQuery } from "@tanstack/vue-query";
import {
  type ComputedRef,
  computed,
  type MaybeRefOrGetter,
  toValue,
} from "vue";
import { useCheloneContext } from "../../../context";

export interface MenuAccessResult {
  /** Whether the current user may perform the action (reactive). */
  canAccess: ComputedRef<boolean>;
  /** Whether the access check is still resolving (reactive; false with no auth). */
  isPending: ComputedRef<boolean>;
}

/** Resolve `canAccess` for a menu item / button, tolerating a missing authProvider. */
export function useMenuAccess(
  params: MaybeRefOrGetter<CanAccessParams>,
): MenuAccessResult {
  const { authProvider } = useCheloneContext();
  // Access control is only "configured" when a provider AND a `canAccess` method
  // exist; otherwise every check allows (never fires a query).
  const hasControl = authProvider?.canAccess != null;

  const query = useQuery(
    computed(() => ({
      // A stub provider satisfies the option factory's type when none is
      // configured; the query is disabled in that case so it never runs.
      ...canAccessQueryOptions(
        authProvider ?? ({} as NonNullable<typeof authProvider>),
        toValue(params),
      ),
      enabled: hasControl,
    })),
  );

  return {
    // No provider (or no canAccess method) → allow, never pending. This must win
    // over vue-query's own `isPending` (a disabled, never-fetched query reports
    // `isPending: true` — the undefined-tolerant contract overrides that).
    canAccess: computed(() =>
      !hasControl ? true : (query.data.value ?? false),
    ),
    isPending: computed(() => (!hasControl ? false : query.isPending.value)),
  };
}
