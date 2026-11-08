/**
 * `<UserMenu>` — the avatar dropdown in the app bar. Ported from shadmin
 * `layout/user-menu.tsx`; the seams (shadmin-core's `useAuthProvider` /
 * `useGetIdentity` / `UserMenuContext`) are rewired to `@chelone/react`.
 *
 * Chelone divergences:
 * - No `useAuthProvider` hook — presence is read via `useCheloneContext()`.
 *   With NO authProvider the menu renders nothing (parity with shadmin).
 * - `useGetIdentity()` throws without an authProvider, so the identity read is
 *   isolated in `<UserMenuInner>`, mounted only past the provider guard (a hook
 *   cannot be called conditionally).
 * - No `UserMenuContext` (chelone has no onClose context); the `<DropdownMenu>`
 *   owns its open state.
 */

import { Children, type ReactNode, useState } from "react";
import { Logout } from "@/components/admin/auth/logout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetIdentity } from "../../../auth-hooks";
import { useCheloneContext } from "../../../context";
import { useTranslate } from "../../../i18n-hooks";

export interface UserMenuProps {
  children?: ReactNode;
  label?: string;
  icon?: ReactNode;
}

/**
 * The user menu in the top-right corner of the admin layout.
 *
 * Displays the user's avatar + name (from the identity provider) and a logout
 * action. Renders nothing when no `authProvider` is configured.
 */
function UserMenu(props: UserMenuProps) {
  const { authProvider } = useCheloneContext();
  if (!authProvider) return null;
  return <UserMenuInner {...props} />;
}

/** The identity-reading body, mounted only when an authProvider exists. */
function UserMenuInner({ children, label, icon }: UserMenuProps) {
  const { isPending, data: identity } = useGetIdentity();
  const translate = useTranslate();
  const [open, setOpen] = useState(false);

  if (isPending) {
    return <Skeleton className="size-8 rounded-full ml-2" />;
  }

  const ariaLabel =
    label != null
      ? translate(label, { _: label })
      : identity?.fullName ||
        translate("chelone.auth.user_menu", { _: "User menu" });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-8 ml-2 rounded-full"
          aria-label={ariaLabel}
        >
          {icon ? (
            icon
          ) : (
            <Avatar className="size-8">
              <AvatarImage src={identity?.avatar} alt={identity?.fullName} />
              <AvatarFallback>{identity?.fullName?.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-y-1">
            <p className="text-sm font-medium leading-none">
              {identity?.fullName}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {children}
        {Children.count(children) > 0 && <DropdownMenuSeparator />}
        <Logout />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { UserMenu };
