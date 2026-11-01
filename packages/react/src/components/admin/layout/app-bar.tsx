/**
 * `<AppBar>` — the header at the top of the admin layout. Ported from shadmin
 * `layout/app-bar.tsx`; the sub-component seams are rewired to `@chelone/react`.
 *
 * Chelone divergence: the default right-side toolbar is `<LocalesMenuButton>` +
 * `<ThemeModeToggle>`. shadmin's cluster also has `<RefreshButton>`, which stays
 * out. The `toolbar` prop remains the override seam for the whole cluster.
 */

import type { HTMLAttributes, ReactNode } from "react";
import { LocalesMenuButton } from "@/components/admin/buttons/locales-menu-button";
import { SidebarToggleButton } from "@/components/admin/buttons/sidebar-toggle-button";
import { cn } from "@/lib/utils";
import { ThemeModeToggle } from "./theme-mode-toggle";
import { TitlePortal } from "./title-portal";
import { UserMenu } from "./user-menu";

export type AppBarProps = HTMLAttributes<HTMLElement> & {
  /**
   * When provided, replaces the ENTIRE default AppBar layout (the default is:
   * sidebar trigger, breadcrumb portal, title portal, toolbar, user menu).
   */
  children?: ReactNode;
  /**
   * Replaces the default right-side action cluster (`<LocalesMenuButton>` + `<ThemeModeToggle>`). Pass a
   * node to supply custom actions, or omit to keep the default.
   */
  toolbar?: ReactNode;
  /**
   * Replaces the default `<UserMenu />`. Pass `false` to suppress it entirely,
   * or a node to render a custom user menu.
   */
  userMenu?: ReactNode | false;
};

/**
 * The header at the top of the admin layout: sidebar trigger, breadcrumb/title
 * slot, toolbar buttons, and the user menu. Pass `children` to fully replace the
 * layout when composing a custom header.
 *
 * @example
 * import { AppBar, TitlePortal } from "@chelone/react";
 *
 * const MyAppBar = () => (
 *   <AppBar>
 *     <TitlePortal />
 *     <MyCustomButton />
 *   </AppBar>
 * );
 */
function AppBar({
  children,
  className,
  toolbar,
  userMenu,
  ...rest
}: AppBarProps) {
  return (
    <header
      className={cn(
        "flex h-16 md:h-12 shrink-0 items-center gap-2 px-4",
        className,
      )}
      {...rest}
    >
      {children ?? (
        <>
          <SidebarToggleButton />
          <div className="flex items-center min-w-0" id="breadcrumb" />
          <TitlePortal />
          {toolbar !== undefined ? (
            toolbar
          ) : (
            <>
              <LocalesMenuButton />
              <ThemeModeToggle />
            </>
          )}
          {userMenu !== false && (userMenu ?? <UserMenu />)}
        </>
      )}
    </header>
  );
}

export { AppBar };
