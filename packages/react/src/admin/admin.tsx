/**
 * `<Admin>` — the children-composable façade (plan D2, THE user's original
 * gripe). Provider config = props; page slots = marker-tagged children hoisted
 * by the partition. It is a thin composition:
 *
 *   <Admin {...config}>{children}</Admin>
 *     ≡ <AdminContext {...config}>
 *         <AdminUI {...slotProps}>{resolvedChildren}</AdminUI>
 *       </AdminContext>
 *
 * so there is no hand-maintained prop-forwarding manifest — a new page slot is
 * one marker component, not a new prop threaded through the shell. The low-level
 * `<AdminContext>` + `<AdminUI>` split stays available as the documented escape
 * hatch (plan D2). Page-slot PROPS are still accepted (`dashboard={…}`) and win
 * over the matching child (handled in `<AdminUI>`).
 *
 * A single async function-child (`(permissions) => node | Promise<node>`) is
 * resolved via `useResolvedChildren` (parity §0a-9) BEFORE it reaches
 * `<AdminUI>`, so the shell always partitions a concrete node.
 *
 * The routing engine (W1-T7) is wired in here as `<AdminUI>`'s `render` prop:
 * `<Admin>` supplies `AdminRoutes`, which reads the partition via `useAdminUI()`
 * and builds the branch-ordered / no-flash / error-boundary tree. The low-level
 * `<AdminUI>` escape hatch still defaults to its placeholder when used directly.
 */

import {
  type AnyCheloneI18n,
  createI18n,
  englishMessages,
  type RegisteredPermissions,
  type ResourceMap,
} from "@chelone/core";
import { type ReactNode, useRef } from "react";
import type { RouterAdapter } from "../router/adapter";
import { AdminContext, type AdminContextProps } from "./admin-context";
import { AdminOutlet, AdminRoutes } from "./admin-routes";
import { type AdminSlotProps, AdminUI } from "./admin-ui";
import { type AdminChildren, useResolvedChildren } from "./partition";
import {
  AdminAccessDenied,
  AdminAuthCallback,
  AdminAuthenticationError,
  AdminCatchAll,
  AdminDashboard,
  AdminError,
  AdminLayout,
  AdminLoading,
  AdminLoginPage,
  AdminReady,
  AdminTitle,
  CustomRoutes,
} from "./slots";

/**
 * `<Admin>`'s props: the provider config (from `AdminContextProps`, minus its
 * low-level `adapter`/`children` which `<Admin>` renames / owns), the page-slot
 * override props, plus the composable extras.
 */
export interface AdminProps<TResources extends ResourceMap = ResourceMap>
  extends Omit<AdminContextProps<TResources>, "adapter" | "children">,
    AdminSlotProps {
  /**
   * The router adapter (defaults to `reactRouterAdapter`). Named `router` here
   * (the app-facing name); mapped to `<AdminContext>`'s `adapter` prop.
   */
  router?: RouterAdapter;
  /** Gate the shell on auth (the no-flash gate — consumed by W1-T7). */
  requireAuth?: boolean;
  /**
   * Mount the admin's own route table (default `true`). Pass `false` when the
   * app routes its own URLs: `<Admin>` then renders the layout around the
   * router's outlet, and `<CustomRoutes>` and the `authCallback` slot do nothing.
   * `<Resource>` children still register, so the menu and links work.
   */
  routes?: boolean;
  /** The app's permissions, passed to the function-child + registration. */
  permissions?: RegisteredPermissions;
  /**
   * Resources / custom routes / page-slot markers — OR a single
   * `(permissions) => node | Promise<node>` function-child (parity §0a-9).
   */
  children?: AdminChildren;
}

/** The static page-slot markers exposed on `<Admin>` (`<Admin.Dashboard>` etc.). */
interface AdminStatics {
  Title: typeof AdminTitle;
  Layout: typeof AdminLayout;
  LoginPage: typeof AdminLoginPage;
  Dashboard: typeof AdminDashboard;
  CatchAll: typeof AdminCatchAll;
  Error: typeof AdminError;
  Ready: typeof AdminReady;
  AuthCallback: typeof AdminAuthCallback;
  Loading: typeof AdminLoading;
  AccessDenied: typeof AdminAccessDenied;
  AuthenticationError: typeof AdminAuthenticationError;
  CustomRoutes: typeof CustomRoutes;
}

/**
 * Resolve a function/async child to a node, then render the shell. The raw
 * admin children are passed as `adminChildren` (NOT the JSX `children` prop):
 * they can be a `(permissions) => …` FUNCTION, which is not React children, so
 * naming it `children` would be misleading (and trip `noChildrenProp`).
 */
function AdminInner({
  requireAuth,
  routes,
  permissions,
  slotProps,
  adminChildren,
}: {
  requireAuth: boolean;
  routes: boolean;
  permissions: RegisteredPermissions | undefined;
  slotProps: AdminSlotProps;
  adminChildren: AdminChildren;
}): ReactNode {
  const { status, node } = useResolvedChildren(adminChildren, permissions);
  return (
    <AdminUI
      requireAuth={requireAuth}
      permissions={permissions}
      childrenStatus={status}
      render={routes ? AdminRoutes : AdminOutlet}
      {...slotProps}
    >
      {node}
    </AdminUI>
  );
}

/**
 * The children-composable admin façade. See the module doc for the composition.
 */
function AdminComponent<TResources extends ResourceMap = ResourceMap>({
  dataProvider,
  queryClient,
  store,
  i18n,
  authProvider,
  notifications,
  resources,
  registry,
  router,
  basename,
  requireAuth = false,
  routes = true,
  permissions,
  children,
  // The remaining props are the page-slot overrides.
  title,
  layout,
  loginPage,
  dashboard,
  catchAll,
  error,
  ready,
  authCallback,
  loading,
  accessDenied,
  authenticationError,
}: AdminProps<TResources>): ReactNode {
  // Built once, and only when the app brings no i18n of its own.
  const englishI18n = useRef<AnyCheloneI18n>(null);
  if (i18n === undefined && englishI18n.current === null) {
    englishI18n.current = createI18n({
      locale: "en",
      messages: { en: englishMessages },
    });
  }
  const slotProps: AdminSlotProps = {
    title,
    layout,
    loginPage,
    dashboard,
    catchAll,
    error,
    ready,
    authCallback,
    loading,
    accessDenied,
    authenticationError,
  };
  return (
    <AdminContext<TResources>
      dataProvider={dataProvider}
      queryClient={queryClient}
      store={store}
      i18n={i18n ?? englishI18n.current ?? undefined}
      authProvider={authProvider}
      notifications={notifications}
      resources={resources}
      registry={registry}
      adapter={router}
      basename={basename}
    >
      <AdminInner
        requireAuth={requireAuth}
        routes={routes}
        permissions={permissions}
        slotProps={slotProps}
        adminChildren={children}
      />
    </AdminContext>
  );
}

/** `<Admin>` — the façade component with the page-slot markers as statics. */
export const Admin: (<TResources extends ResourceMap = ResourceMap>(
  props: AdminProps<TResources>,
) => ReactNode) &
  AdminStatics = Object.assign(AdminComponent, {
  Title: AdminTitle,
  Layout: AdminLayout,
  LoginPage: AdminLoginPage,
  Dashboard: AdminDashboard,
  CatchAll: AdminCatchAll,
  Error: AdminError,
  Ready: AdminReady,
  AuthCallback: AdminAuthCallback,
  Loading: AdminLoading,
  AccessDenied: AdminAccessDenied,
  AuthenticationError: AdminAuthenticationError,
  CustomRoutes,
});
