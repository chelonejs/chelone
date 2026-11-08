/**
 * `<DashboardMenuItem>` — sidebar entry linking to the dashboard (`/`). Ported
 * from shadmin `layout/dashboard-menu-item.tsx`; the seams (shadmin-core's
 * `useBasename`/`useTranslate`) are rewired to `@chelone/react`.
 */

import { House } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslate } from "../../../i18n-hooks";
import { useBasename } from "../../../router";
import { MenuItemLink } from "./menu-item-link";

const defaultIcon = <House />;

export interface DashboardMenuItemProps {
  /** Extra CSS class appended to the underlying menu button. */
  className?: string;
  /** Click handler invoked after the default navigation (e.g. close drawer). */
  onClick?: () => void;
  /** Replaces the default `<House />` icon. */
  icon?: ReactNode;
  /**
   * Replaces the default translated label (`chelone.page.dashboard`). Strings are
   * translated (with the string as fallback); ReactNodes render as-is.
   */
  label?: ReactNode;
}

/**
 * Sidebar entry linking to the dashboard (`/`).
 *
 * The default `<Menu>` renders this when an `<Admin dashboard>` is configured
 * (via `useHasDashboard`).
 *
 * @example
 * import { DashboardMenuItem } from "@chelone/react";
 *
 * const CustomMenu = () => (
 *   <Menu>
 *     <DashboardMenuItem />
 *   </Menu>
 * );
 */
function DashboardMenuItem({
  className,
  onClick,
  icon,
  label,
}: DashboardMenuItemProps) {
  const translate = useTranslate();
  const basename = useBasename();
  const finalText =
    label === undefined
      ? translate("chelone.page.dashboard", { _: "Dashboard" })
      : typeof label === "string"
        ? translate(label, { _: label })
        : label;
  return (
    <MenuItemLink
      to={`${basename}/`}
      label={finalText}
      icon={icon ?? defaultIcon}
      className={className}
      onClick={onClick}
    />
  );
}

export { DashboardMenuItem };
