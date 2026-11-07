/**
 * The structural sidebar wrappers — thin styled containers with no behavior, the
 * Vue analog of shadcn's `SidebarHeader` / `SidebarContent` / `SidebarFooter` /
 * `SidebarGroup*` / `SidebarMenu` / `SidebarMenuItem`. Each is a functional
 * component (a `div`/`ul`/`li` with the shadcn class recipe + a `data-slot`),
 * so the whole family lives in one dependency-free module instead of eight
 * near-empty SFCs. Interactive parts (`SidebarProvider`, `Sidebar`,
 * `SidebarTrigger`, `SidebarMenuButton`) stay as SFCs.
 */

import { type FunctionalComponent, h } from "vue";
import { cn } from "../../../lib/utils";

interface StructuralProps {
  class?: string;
}

/** Build a functional wrapper: `<tag data-slot class>` around its default slot. */
function structural(
  slot: string,
  tag: string,
  base: string,
): FunctionalComponent<StructuralProps> {
  const component: FunctionalComponent<StructuralProps> = (props, { slots }) =>
    h(
      tag,
      { "data-slot": slot, class: cn(base, props.class) },
      slots.default?.(),
    );
  component.props = ["class"];
  component.displayName = slot;
  return component;
}

export const SidebarHeader = structural(
  "sidebar-header",
  "div",
  "flex flex-col gap-2 p-2",
);
export const SidebarContent = structural(
  "sidebar-content",
  "div",
  "flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:p-0",
);
export const SidebarFooter = structural(
  "sidebar-footer",
  "div",
  "flex flex-col gap-2 p-2",
);
export const SidebarGroup = structural(
  "sidebar-group",
  "div",
  "relative flex w-full min-w-0 flex-col p-2",
);
export const SidebarGroupContent = structural(
  "sidebar-group-content",
  "div",
  "w-full text-sm",
);
export const SidebarGroupLabel = structural(
  "sidebar-group-label",
  "div",
  "flex h-8 shrink-0 items-center px-2 text-xs font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
);
export const SidebarMenu = structural(
  "sidebar-menu",
  "ul",
  "flex w-full min-w-0 flex-col gap-1",
);
export const SidebarMenuItem = structural(
  "sidebar-menu-item",
  "li",
  "group/menu-item relative",
);
