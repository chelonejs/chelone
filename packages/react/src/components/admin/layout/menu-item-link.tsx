/**
 * `<MenuItemLink>` — a clickable sidebar entry that navigates to a route.
 * Ported from shadmin `layout/menu-item-link.tsx`; the seams (shadmin-core's
 * `useBasename`/`useTranslate` + react-router's `Link`/`useMatch`/`useNavigate`)
 * are rewired to `@chelone/react`'s router adapter + i18n hooks.
 *
 * Chelone divergences:
 * - `to` is a `string` (chelone's adapter `Link`/`useNavigate` take a path
 *   string, not react-router's `To` object).
 * - `Link` comes from `useRouterAdapter().Link` (the framework-swappable seam).
 */

import type { ComponentProps, ReactNode } from "react";
import { useEffect } from "react";
import { KeyboardShortcut } from "@/components/admin/common/keyboard-shortcut";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslate } from "../../../i18n-hooks";
import { useBasename, useMatch, useNavigate } from "../../../router";
import { useRouterAdapter } from "../../../router/adapter";

const KEY_TO_PROP: Record<
  string,
  "metaKey" | "ctrlKey" | "shiftKey" | "altKey"
> = {
  meta: "metaKey",
  cmd: "metaKey",
  ctrl: "ctrlKey",
  shift: "shiftKey",
  alt: "altKey",
  option: "altKey",
};

const isMac =
  typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

function parseShortcut(shortcut: string) {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((s) => s.trim());
  const modifiers = new Set<string>();
  let key = "";
  for (const part of parts) {
    if (part === "mod") {
      modifiers.add(isMac ? "metaKey" : "ctrlKey");
    } else if (KEY_TO_PROP[part]) {
      modifiers.add(KEY_TO_PROP[part]);
    } else {
      key = part;
    }
  }
  return { modifiers, key };
}

export interface MenuItemLinkProps {
  /**
   * Target path for the link. Compared against the current location to derive
   * the active state.
   */
  to: string;
  /**
   * The text rendered alongside `icon`. Strings are auto-translated via
   * `useTranslate` (with the string itself as the fallback). Pass a ReactNode
   * to render custom content without a translation lookup.
   */
  label: ReactNode;
  /** Icon rendered before `label` (a lucide icon or any ReactNode). */
  icon?: ReactNode;
  /** Extra CSS class appended to the underlying `<SidebarMenuButton>`. */
  className?: string;
  /**
   * Click handler invoked after the default navigation. The default
   * `<AppSidebar>` uses this to close the mobile drawer.
   */
  onClick?: () => void;
  /**
   * Keyboard shortcut string (e.g. `"mod+k"`, `"shift+/"`). When pressed
   * anywhere, navigates to `to`. `mod` normalizes to `metaKey` on macOS,
   * `ctrlKey` elsewhere.
   */
  keyboardShortcut?: string;
  /**
   * Visual representation of the keyboard shortcut rendered after the label.
   * Defaults to `<KeyboardShortcut keyboardShortcut={keyboardShortcut} />`.
   */
  keyboardShortcutRepresentation?: ReactNode;
  /**
   * Extra props forwarded to the `<Tooltip>` wrapping the menu item.
   */
  tooltipProps?: Omit<ComponentProps<typeof Tooltip>, "children">;
}

/**
 * A clickable sidebar entry that navigates to a route via the router adapter.
 *
 * The active state is derived from `useMatch`; when the current pathname
 * matches `to`, the item is highlighted. Building block for custom sidebar
 * menus and used internally by `<DashboardMenuItem>` / `<ResourceMenuItem>`.
 *
 * @example
 * import { Settings } from "lucide-react";
 * import { MenuItemLink } from "@chelone/react";
 *
 * const SettingsItem = () => (
 *   <MenuItemLink to="/settings" label="Settings" icon={<Settings />} />
 * );
 */
function MenuItemLink({
  to,
  label,
  icon,
  className,
  onClick,
  keyboardShortcut,
  keyboardShortcutRepresentation,
  tooltipProps,
}: MenuItemLinkProps) {
  const translate = useTranslate();
  const basename = useBasename();
  const navigate = useNavigate();
  const { Link } = useRouterAdapter();
  const finalText =
    typeof label === "string" ? translate(label, { _: label }) : label;
  const match = useMatch({ path: to, end: to === `${basename}/` });
  const { open, openMobile, setOpenMobile } = useSidebar();
  const handleClick = () => {
    if (openMobile) {
      setOpenMobile(false);
    }
    onClick?.();
  };

  useEffect(() => {
    if (!keyboardShortcut) return;
    const { modifiers, key } = parseShortcut(keyboardShortcut);
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key) return;
      for (const mod of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
        const required = modifiers.has(mod);
        if (e[mod] !== required) return;
      }
      e.preventDefault();
      navigate(to);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [keyboardShortcut, to, navigate]);

  const shortcutNode =
    keyboardShortcut !== undefined
      ? (keyboardShortcutRepresentation ?? (
          <KeyboardShortcut keyboardShortcut={keyboardShortcut} />
        ))
      : null;

  const button = (
    <SidebarMenuButton asChild isActive={!!match} className={className}>
      <Link to={to} onClick={handleClick}>
        {icon}
        {finalText}
        {shortcutNode && <span className="ml-auto">{shortcutNode}</span>}
      </Link>
    </SidebarMenuButton>
  );

  return (
    <SidebarMenuItem>
      {open && !tooltipProps ? (
        button
      ) : (
        <Tooltip {...tooltipProps}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{finalText}</TooltipContent>
        </Tooltip>
      )}
    </SidebarMenuItem>
  );
}

export { MenuItemLink };
