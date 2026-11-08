/**
 * `<Logout>` — a logout menu item, designed as a child of `<UserMenu>` (or any
 * shadcn `<DropdownMenuContent>`). Ported from shadmin `auth/logout.tsx`; the
 * seams (shadmin-core's `useAuthState`/`useLogout` + the `<Translate>`
 * component) are rewired to `@chelone/react`.
 *
 * Chelone divergences:
 * - `useAuthState()` returns a `useQuery` result → read `data?.authenticated`.
 * - `useLogout()` returns a `useMutation` → call `logout.mutate(...)`.
 * - No `<Translate>` component in chelone → the label is resolved via
 *   `useTranslate`.
 * - Requires an `authProvider` (the auth hooks throw without one); mount it
 *   only within an authenticated context — `<UserMenu>` already guards this.
 */

import { LogOut } from "lucide-react";
import { type ReactNode, useCallback } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthState, useLogout } from "../../../auth-hooks";
import { useTranslate } from "../../../i18n-hooks";

export interface LogoutProps {
  className?: string;
  /**
   * Path the user is redirected to after logout. Passed through to the
   * authProvider's `logout` params.
   */
  redirectTo?: string;
  /** Custom icon rendered alongside the logout label. Defaults to a power icon. */
  icon?: ReactNode;
}

/**
 * Logout menu item. Calls `useLogout()` on click; renders nothing when the user
 * is not authenticated.
 */
function Logout({ className, redirectTo, icon }: LogoutProps) {
  const { data } = useAuthState();
  const logout = useLogout();
  const translate = useTranslate();

  const handleClick = useCallback(
    () => logout.mutate(redirectTo != null ? { redirectTo } : undefined),
    [logout, redirectTo],
  );

  if (!data?.authenticated) return null;

  return (
    <DropdownMenuItem
      onClick={handleClick}
      className={cn("cursor-pointer", className)}
    >
      {icon ?? <LogOut />}
      {translate("chelone.auth.logout", { _: "Log out" })}
    </DropdownMenuItem>
  );
}

export { Logout };
