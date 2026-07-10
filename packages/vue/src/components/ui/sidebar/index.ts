// The dependency-free shadcn-vue `Sidebar` primitive family the ported admin
// layout consumes. Interactive parts are SFCs; structural wrappers are the
// functional components in `sidebar-parts.ts`; `useSidebar` + state types live
// in `sidebar-context.ts`.

export type { SidebarProps } from "./sidebar.vue";
export { default as Sidebar } from "./sidebar.vue";
export type {
  SidebarContext,
  SidebarState,
} from "./sidebar-context";
export {
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SidebarContextKey,
  useSidebar,
} from "./sidebar-context";
export type { SidebarMenuButtonProps } from "./sidebar-menu-button.vue";
export { default as SidebarMenuButton } from "./sidebar-menu-button.vue";
export {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "./sidebar-parts";
export type { SidebarProviderProps } from "./sidebar-provider.vue";
export { default as SidebarProvider } from "./sidebar-provider.vue";
export { default as SidebarTrigger } from "./sidebar-trigger.vue";
