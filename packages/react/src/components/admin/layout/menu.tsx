/**
 * `<Menu>` — the sidebar navigation menu. Ported from shadmin `layout/menu.tsx`;
 * the seams (shadmin-core's `useHasDashboard`/`useResourceDefinitions`) are
 * rewired to `@chelone/react`.
 *
 * Renders a dashboard link (when `useHasDashboard()` is true) followed by one
 * link per resource that exposes a list view. Resources are grouped by their
 * `options.group` string.
 *
 * Chelone divergence: the menu group is read from the resource's OPEN options
 * bag (`definition.options.group`), NOT a top-level `group` field — core's
 * `ResourceDefinition` exposes grouping through `options` (D9), so
 * `<Resource name="posts" options={{ group: "Content" }} />` buckets under
 * "Content".
 */

import type { ResourceDefinition } from "@chelone/core";
import type { ReactNode } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useHasDashboard } from "../../../admin";
import { useResourceDefinitions } from "../../../resource";
import { DashboardMenuItem } from "./dashboard-menu-item";
import { MenuItemLink } from "./menu-item-link";
import { ResourceMenuItem } from "./resource-menu-item";
import { ResourceMenuItemGroup } from "./resource-menu-item-group";

export interface MenuProps {
  /**
   * When provided, replaces the default resource-list rendering. Use
   * `<Menu.Item>`, `<Menu.DashboardItem>` and `<Menu.ResourceItem>` as children.
   */
  children?: ReactNode;
  /** Extra CSS class appended to the wrapping `<SidebarMenu>`. */
  className?: string;
}

interface ResourceMenuGroup {
  label: string;
  resources: string[];
}

/** Read a resource's menu group from its open options bag (`options.group`). */
function groupOf(resource: ResourceDefinition): string | undefined {
  const group = resource.options?.group;
  return typeof group === "string" ? group.trim() : undefined;
}

const getResourceMenuGroups = (
  resources: Record<string, ResourceDefinition>,
) => {
  const groupedResources: ResourceMenuGroup[] = [];
  const groupIndexes = new Map<string, number>();
  const ungroupedResources: string[] = [];

  for (const [name, resource] of Object.entries(resources)) {
    if (!resource.hasList) continue;

    const group = groupOf(resource);

    if (!group) {
      ungroupedResources.push(name);
      continue;
    }

    const existingIndex = groupIndexes.get(group);
    const existing =
      existingIndex === undefined ? undefined : groupedResources[existingIndex];

    if (existing === undefined) {
      groupIndexes.set(group, groupedResources.length);
      groupedResources.push({ label: group, resources: [name] });
      continue;
    }

    existing.resources.push(name);
  }

  return { groupedResources, ungroupedResources };
};

/**
 * Renders the sidebar menu: a dashboard link (if defined) followed by one link
 * per resource that exposes a list view. Resources sharing an `options.group`
 * are grouped under a collapsible section.
 *
 * @example // The default resource-based menu
 * import { Menu } from "@chelone/react";
 * const Sidebar = () => <Menu />;
 *
 * @example // A custom menu
 * import { Settings } from "lucide-react";
 * import { Menu } from "@chelone/react";
 *
 * const Sidebar = () => (
 *   <Menu>
 *     <Menu.DashboardItem />
 *     <Menu.ResourceItem name="posts" />
 *     <Menu.Item to="/settings" label="Settings" icon={<Settings />} />
 *   </Menu>
 * );
 */
function Menu({ children, className }: MenuProps) {
  const hasDashboard = useHasDashboard();
  const resources = useResourceDefinitions();
  const { groupedResources, ungroupedResources } =
    getResourceMenuGroups(resources);

  if (children !== undefined && children !== null) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu className={cn(className)}>{children}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      {hasDashboard ? (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={cn(className)}>
              <DashboardMenuItem />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : null}
      {groupedResources.map(({ label, resources: groupResources }) => (
        <ResourceMenuItemGroup
          key={label}
          label={label}
          resources={groupResources}
          menuClassName={className}
        />
      ))}
      <ResourceMenuItemGroup
        resources={ungroupedResources}
        menuClassName={className}
      />
    </>
  );
}

// Re-export menu pieces for convenience (mirrors the react-admin menu API).
Menu.Item = MenuItemLink;
Menu.DashboardItem = DashboardMenuItem;
Menu.ResourceItem = ResourceMenuItem;
Menu.ResourceGroup = ResourceMenuItemGroup;

export { Menu };
