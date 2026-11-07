/**
 * `<Layout>` — the default admin layout (the `<Admin>` layout slot). Ported from
 * shadmin `layout/layout.tsx`; the seams are rewired to `@chelone/react`.
 *
 * Renders the app shell: a collapsible sidebar (`<AppSidebar>` → `<Menu>`), a
 * header (`<AppBar>`), a content area, and the `<Notification>` toaster. The
 * `children` are the route content the P6 `<AdminRoutes>` shell injects into
 * this slot (via `cloneElement`), so an app declares it as
 * `<Admin><Admin.Layout><Layout/></Admin.Layout>…</Admin>`.
 *
 * Chelone divergences from the shadmin original (deliberate, documented):
 * - No `react-error-boundary` dependency: the content boundary uses chelone's
 *   in-house `ShellErrorBoundary` / `DefaultErrorFallback` (the `error` slot
 *   overrides the fallback). The P6 shell already wraps this `<Layout>` in its
 *   OWN `ShellErrorBoundary`; the inner one here isolates content-area crashes.
 * - `<SkipNavigationButton>` comes first in the DOM, ahead of the sidebar it
 *   skips (WCAG 2.4.1). `id="main-content"` sits on the content area below the
 *   app bar, so the next Tab after a skip lands on the first control there.
 * - The Suspense fallback is a minimal inline node, not the delayed `<Loading>`.
 * - `CoreLayoutProps` (a shadmin-core type) does not exist in chelone; the slot
 *   contract is simply `{ children }`.
 */

import type { ComponentType, ReactNode } from "react";
import { Suspense } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { type ErrorFallbackProps, ShellErrorBoundary } from "../../../admin";
import { SkipNavigationButton } from "../buttons/skip-navigation-button";
import { Notification } from "../feedback/notification";
import { AppBar, type AppBarProps } from "./app-bar";
import { AppSidebar, type AppSidebarProps } from "./app-sidebar";
import { Menu, type MenuProps } from "./menu";

export interface LayoutProps {
  /** The route content injected by the `<Admin>`/`<AdminRoutes>` shell. */
  children?: ReactNode;
  /** Replaces the default `<AppBar />` at the top of the content area. */
  appBar?: ComponentType<AppBarProps>;
  /** Replaces the default `<Menu />` inside the sidebar content area. */
  menu?: ComponentType<MenuProps>;
  /** Replaces the default `<AppSidebar>` component. */
  sidebar?: ComponentType<AppSidebarProps>;
  /**
   * Replaces the content-boundary fallback. A node renders verbatim; a render
   * function receives `{ error, errorInfo, resetErrorBoundary }`.
   */
  error?: ReactNode | ((props: ErrorFallbackProps) => ReactNode);
}

/**
 * The main application layout: sidebar, header, content area, and notifications.
 *
 * @example
 * import { Admin, Layout, Resource } from "@chelone/react";
 *
 * const App = () => (
 *   <Admin dataProvider={dataProvider}>
 *     <Admin.Layout>
 *       <Layout />
 *     </Admin.Layout>
 *     <Resource name="posts" list={PostList} />
 *   </Admin>
 * );
 */
function Layout(props: LayoutProps) {
  const { appBar, menu, sidebar, error, children } = props;
  const AppBarComponent = appBar ?? AppBar;
  const SidebarComponent = sidebar ?? AppSidebar;
  const MenuComponent = menu ?? Menu;

  return (
    <SidebarProvider>
      <SkipNavigationButton />
      <SidebarComponent>
        <MenuComponent />
      </SidebarComponent>
      <main
        className={cn(
          "ml-auto w-full max-w-full",
          "peer-data-[state=collapsed]:w-[calc(100%-var(--sidebar-width-icon)-1rem-2px)]",
          "peer-data-[state=expanded]:w-[calc(100%-var(--sidebar-width))]",
          "sm:transition-[width] sm:duration-200 sm:ease-linear",
          "flex h-svh flex-col",
        )}
      >
        <AppBarComponent />
        <div id="main-content" className="flex flex-1 flex-col">
          <ShellErrorBoundary fallback={error}>
            <Suspense fallback={<div className="px-4 py-2">Loading…</div>}>
              <div className="flex flex-1 flex-col px-4">{children}</div>
            </Suspense>
          </ShellErrorBoundary>
        </div>
      </main>
      <Notification />
    </SidebarProvider>
  );
}

export { Layout };
