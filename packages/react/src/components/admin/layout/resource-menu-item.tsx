/**
 * `<ResourceMenuItem>` — sidebar entry linking to a resource list view. Ported
 * from shadmin `layout/resource-menu-item.tsx`; the seams (shadmin-core's
 * auth/resource/router hooks) are rewired to `@chelone/react`.
 *
 * Chelone divergences:
 * - Access is gated by `useMenuAccess` (a no-throw `useCanAccess` — a no-auth
 *   app renders every resource item).
 * - `Link` comes from the router adapter; navigation `state` carries the
 *   `_scrollToTop` flag the P6 scroll manager reads.
 */

import { List } from "lucide-react";
import { createElement, type ReactNode } from "react";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetResourceLabel } from "../../../label";
import { useResourceDefinitions } from "../../../resource";
import { useBasename, useCreatePath, useMatch } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";
import { useMenuAccess } from "./use-menu-access";

export interface ResourceMenuItemProps {
  /**
   * The resource name (matches a `<Resource name>` registered in `<Admin>`).
   * Used to look up the definition, label, icon and list path.
   */
  name: string;
  /** Override the label. Defaults to the pluralised resource label. */
  label?: ReactNode;
  /** Override the icon. Defaults to the resource icon or `<List />`. */
  icon?: ReactNode;
  /** Extra CSS class appended to the underlying menu button. */
  className?: string;
  /** Click handler invoked after the default navigation (e.g. close drawer). */
  onClick?: () => void;
  /** Extra props spread onto the underlying `<SidebarMenuButton>`. */
  tooltipProps?: Record<string, unknown>;
}

/**
 * Sidebar entry linking to a resource list view.
 *
 * Resolves the resource definition (label, icon, list path) and renders a
 * `<SidebarMenuItem>` navigating to the list view. Returns `null` when the
 * current user lacks `list` access; shows a `<Skeleton>` while the check is
 * pending.
 *
 * @example
 * import { ResourceMenuItem } from "@chelone/react";
 *
 * <Menu>
 *   <ResourceMenuItem name="posts" />
 *   <ResourceMenuItem name="comments" />
 * </Menu>
 */
function ResourceMenuItem({
  name,
  label,
  icon,
  className,
  onClick,
  ...rest
}: ResourceMenuItemProps) {
  const { canAccess, isPending } = useMenuAccess({
    resource: name,
    action: "list",
  });
  const resources = useResourceDefinitions();
  const getResourceLabel = useGetResourceLabel();
  const createPath = useCreatePath();
  const basename = useBasename();
  const { Link } = useRouterAdapter();
  const to = createPath({ resource: name, type: "list" });
  const match = useMatch({ path: to, end: to === `${basename}/` });
  const { openMobile, setOpenMobile } = useSidebar();

  if (isPending) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (!resources?.[name] || !canAccess) return null;

  const handleClick = () => {
    if (openMobile) {
      setOpenMobile(false);
    }
    onClick?.();
  };

  const definitionIcon = resources[name].icon;
  const resolvedIcon =
    icon !== undefined ? (
      icon
    ) : definitionIcon ? (
      createElement(definitionIcon)
    ) : (
      <List />
    );

  const resolvedLabel = label !== undefined ? label : getResourceLabel(name, 2);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={!!match}
        className={className}
        {...rest}
      >
        <Link to={to} state={{ _scrollToTop: true }} onClick={handleClick}>
          {resolvedIcon}
          {resolvedLabel}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export { ResourceMenuItem };
