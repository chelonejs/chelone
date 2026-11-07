/**
 * `<ResourceMenuItemGroup>` — a sidebar group of resource menu entries. Ported
 * from shadmin `layout/resource-menu-item-group.tsx`; the ONE seam
 * (shadmin-core's `useResourceDefinitions`) is rewired to `@chelone/react`.
 * Labeled groups are collapsible; unlabeled groups render as a plain section.
 */

import { ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useResourceDefinitions } from "../../../resource";
import { ResourceMenuItem } from "./resource-menu-item";

export interface ResourceMenuItemGroupProps {
  /** Optional section label. Omit for the ungrouped resource section. */
  label?: string;
  /**
   * Resource names to render. When omitted, every registered resource with
   * `hasList === true` is rendered.
   */
  resources?: string[];
  /** Extra CSS class appended to the wrapping sidebar group. */
  className?: string;
  /** Extra CSS class appended to the underlying sidebar menu. */
  menuClassName?: string;
  /** Initial open state for labeled (collapsible) groups. */
  defaultOpen?: boolean;
  /** Extra entries after the resources, inside the group, so a collapse hides them too. */
  children?: ReactNode;
}

/**
 * Sidebar group containing resource menu entries.
 *
 * @example
 * import { ResourceMenuItemGroup } from "@chelone/react";
 *
 * <ResourceMenuItemGroup label="Content" resources={["posts", "comments"]} />
 */
function ResourceMenuItemGroup({
  label,
  resources: resourcesProp,
  className,
  menuClassName,
  defaultOpen = true,
  children,
}: ResourceMenuItemGroupProps) {
  const resourceDefinitions = useResourceDefinitions();
  const resources =
    resourcesProp ??
    Object.keys(resourceDefinitions).filter(
      (name) => resourceDefinitions[name]?.hasList,
    );

  if (resources.length === 0 && !children) return null;

  const menu = (
    <SidebarGroupContent>
      <SidebarMenu className={cn(menuClassName)}>
        {resources.map((name) => (
          <ResourceMenuItem key={name} name={name} />
        ))}
        {children}
      </SidebarMenu>
    </SidebarGroupContent>
  );

  if (!label) {
    return <SidebarGroup className={className}>{menu}</SidebarGroup>;
  }

  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <SidebarGroup className={className}>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger>
            {label}
            <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>{menu}</CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

export { ResourceMenuItemGroup };
