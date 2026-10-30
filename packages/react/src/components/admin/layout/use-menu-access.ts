/**
 * `useMenuAccess` — a no-throw `useCanAccess` for the sidebar menu.
 *
 * Chelone's `useCanAccess` calls `useCheloneAuthProvider()`, which THROWS when
 * no `authProvider` is configured. A no-auth app must still render its resource
 * menu, so this reads the provider OPTIONALLY (`useCheloneContext`) and only
 * runs the access query when a provider exists. With no provider — or no
 * `canAccess` method — access is allowed (ra-core parity: "access control not
 * configured = allow").
 */

import { type CanAccessParams, canAccessQueryOptions } from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import { useCheloneContext } from "../../../context";

export interface MenuAccessResult {
  /** Whether the current user may perform the action. */
  canAccess: boolean;
  /** Whether the access check is still resolving (always false with no auth). */
  isPending: boolean;
}

/** Resolve `canAccess` for a menu item, tolerating a missing authProvider. */
export function useMenuAccess(params: CanAccessParams): MenuAccessResult {
  const { authProvider } = useCheloneContext();
  const hasProvider = authProvider != null;
  const query = useQuery({
    ...canAccessQueryOptions(
      authProvider ?? ({} as NonNullable<typeof authProvider>),
      params,
    ),
    enabled: hasProvider && authProvider?.canAccess != null,
  });

  // No provider (or no canAccess method) → allow, never pending.
  if (!hasProvider || authProvider?.canAccess == null) {
    return { canAccess: true, isPending: false };
  }
  return { canAccess: query.data ?? false, isPending: query.isPending };
}
