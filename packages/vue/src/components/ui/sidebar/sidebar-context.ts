/**
 * The sidebar context + `useSidebar` composable — the non-component sibling of
 * `sidebar-provider.vue`, keeping the provider SFC component-only. The Vue analog
 * of `@chelone/react`'s `ui/sidebar.tsx` `SidebarContext` / `useSidebar`.
 *
 * DEPENDENCY-FREE: React's shadcn sidebar leans on reka/radix + `use-mobile`;
 * this Vue slice models the same open/collapsed + mobile-drawer state with plain
 * refs provided under a typed `InjectionKey` (no reka-ui). The state shape
 * (`state`/`open`/`setOpen`/`openMobile`/`setOpenMobile`/`isMobile`/
 * `toggleSidebar`) mirrors the members the ported layout components consume.
 */

import { type InjectionKey, inject, type Ref } from "vue";

/** The sidebar's expanded/collapsed visual state (drives `data-state`). */
export type SidebarState = "expanded" | "collapsed";

/** The reactive sidebar contract `<SidebarProvider>` provides. */
export interface SidebarContext {
  /** `"expanded"` when open, `"collapsed"` otherwise. */
  state: Ref<SidebarState>;
  /** Whether the (desktop) sidebar is open. */
  open: Ref<boolean>;
  /** Set the desktop open state. */
  setOpen: (open: boolean) => void;
  /** Whether the mobile drawer is open. */
  openMobile: Ref<boolean>;
  /** Set the mobile drawer open state. */
  setOpenMobile: (open: boolean) => void;
  /** Whether the viewport is in the mobile breakpoint (drawer mode). */
  isMobile: Ref<boolean>;
  /** Toggle the sidebar (mobile drawer on mobile, desktop collapse otherwise). */
  toggleSidebar: () => void;
}

/** Default sidebar width when expanded (CSS var `--sidebar-width`). */
export const SIDEBAR_WIDTH = "16rem";
/** Default sidebar width when collapsed to icons (`--sidebar-width-icon`). */
export const SIDEBAR_WIDTH_ICON = "3rem";

/** The provide/inject key for the sidebar context. */
export const SidebarContextKey: InjectionKey<SidebarContext> =
  Symbol("chelone-sidebar");

/**
 * Read the ambient sidebar context. Throws when used outside a
 * `<SidebarProvider>` — parity with the React twin's `useSidebar`.
 */
export function useSidebar(): SidebarContext {
  const ctx = inject(SidebarContextKey, null);
  if (!ctx) {
    throw new Error("useSidebar must be used within a <SidebarProvider>.");
  }
  return ctx;
}
