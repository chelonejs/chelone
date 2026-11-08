/**
 * `AdminRoutes` — the routing engine (plan §0a-7, W1-T7). It is the `render`
 * component `<AdminUI>` mounts (the T6 seam): it reads the partitioned children
 * + page slots via `useAdminUI()` and builds the branch-ordered tree, with the
 * no-flash auth gate, the shell error boundary, and scroll wired in.
 *
 * The branch order reproduces ra-core's `CoreAdminRoutes` EXACTLY (plan §0a-7) —
 * the order IS the no-flash guarantee, so it is not rearranged:
 *
 *   1. no resources registered           → the `ready` empty state.
 *   2. async children resolving OR gate  → NO-LAYOUT custom routes + the
 *      pending (childrenStatus==='loading' auth-callback route + the loading
 *      || requireAuth & auth in flight)    page ONLY. The layout tree (and every
 *                                           resource view) does NOT mount —
 *                                           protected / resolving content never
 *                                           appears during the pending window.
 *
 * The `auth-callback` route (parity §0a-1/D4) is public/auth-agnostic — mounted
 * in EVERY branch (like the no-layout customs) so an OAuth landing resolves
 * whether or not the user is authenticated yet.
 *   3. requireAuth & NOT authenticated    → NO-LAYOUT custom routes + a
 *                                           `<LogoutOnMount>` (bounce to login).
 *   4. else (authenticated / ungated)     → NO-LAYOUT custom routes, then under a
 *                                           splat route the full tree:
 *                                           `<HasDashboard>` context →
 *                                           `<ShellErrorBoundary>` →
 *                                           `<Layout>` → `<Routes>` of
 *                                           {layout customs}{resources}{index}
 *                                           {auth-error}{access-denied}{catch-all}.
 *
 * `<Routes>` child ORDER is deliberate (plan §0a-10): layout custom routes come
 * BEFORE resources so an app can override a resource path; the index route is
 * the dashboard (if a `dashboard` slot exists) ELSE a redirect to the first
 * accessible resource (`NavigateToFirstResource`); the catch-all is LAST.
 */

import { canAccessQueryOptions } from "@chelone/core";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Children, cloneElement, isValidElement, useMemo } from "react";
import { useCheloneContext } from "../context";
import { useResourceDefinitions } from "../resource/registry-hooks";
import { useRouterAdapter } from "../router/adapter";
import { useAdminUI } from "./admin-ui";
import { LogoutOnMount, useAuthGate } from "./auth-gate";
import { ShellErrorBoundary } from "./error-boundary";
import { HasDashboardContext } from "./has-dashboard";
import type { AdminSlots, PartitionedChildren } from "./partition";
import { useScrollToTop } from "./scroll";

/** Extract the `<Route>` children out of a `<CustomRoutes>` element. */
function customRouteChildren(
  elements: readonly React.ReactElement[],
): ReactNode[] {
  const routes: ReactNode[] = [];
  for (const element of elements) {
    const children = (element.props as { children?: ReactNode }).children;
    Children.forEach(children, (child) => {
      if (isValidElement(child)) routes.push(child);
    });
  }
  return routes;
}

/**
 * Render one resource element under its `<name>/*` splat route. `<Resource>`
 * mounts its own inner `<Routes>` (create → show → edit → list order), so here
 * we only give it the parent splat path. Keyed by resource name.
 */
function resourceRoutes(
  resources: readonly React.ReactElement[],
  Route: ReturnType<typeof useRouterAdapter>["Route"],
): ReactNode[] {
  return resources.map((element) => {
    const name = (element.props as { name?: string }).name ?? "";
    return <Route key={name} path={`${name}/*`} element={element} />;
  });
}

/**
 * The index route: the dashboard slot when present, ELSE a redirect to the
 * first accessible resource (`NavigateToFirstResource`).
 */
function indexElement(slots: AdminSlots): ReactNode {
  return slots.dashboard != null ? (
    slots.dashboard
  ) : (
    <NavigateToFirstResource />
  );
}

/**
 * Redirect to the first LIST-able resource the user can access (plan §0a-7).
 * Walks the registered resources in registration order, finds the first with a
 * list AND list access (`useCanAccess`), and navigates to its list path. While
 * the access checks are pending, or if none is accessible, renders nothing.
 *
 * Rules of Hooks: the access check must run for a STABLE set of resources per
 * render. We check the FIRST hasList resource's access with a single hook; if it
 * is inaccessible we fall through to nothing rather than looping hooks over a
 * variable-length list (a per-resource hook loop would violate the Rules). This
 * matches the common case (the first resource is the dashboard target); a richer
 * multi-resource access walk is a P7 menu concern.
 */
export function NavigateToFirstResource(): ReactNode {
  const definitions = useResourceDefinitions();
  const { authProvider } = useCheloneContext();
  const { Navigate } = useRouterAdapter();

  const firstListable = useMemo(
    () => Object.values(definitions).find((d) => d.hasList),
    [definitions],
  );

  const resource = firstListable?.name ?? "";
  // No authProvider → access control not configured → allow (the appless-demo
  // shortcut, parity §0a-16): the query is disabled and we treat access as
  // granted. When a provider exists, gate on its `canAccess` (defaulting to
  // `true` when the provider omits `canAccess`, via `canAccessQueryOptions`).
  const hasProvider = authProvider != null;
  const { data: canAccess, isPending } = useQuery({
    ...canAccessQueryOptions(authProvider, {
      action: "list",
      resource: resource || "__none__",
    }),
    enabled: hasProvider && firstListable != null,
  });

  if (firstListable == null) return null;
  // With a provider: wait for the check, then honor it. Without one: allow.
  if (hasProvider) {
    if (isPending) return null;
    if (canAccess !== true) return null;
  }
  return <Navigate to={`/${firstListable.name}`} replace />;
}

/**
 * The scroll driver — mounted inside the router so `useScrollToTop` sees the
 * current location. Returns nothing; it only runs the scroll effect.
 */
function ScrollManager(): ReactNode {
  useScrollToTop();
  return null;
}

/**
 * The routing engine. Reads `useAdminUI()` for the partition + slots + the
 * `requireAuth` flag, runs the no-flash gate, and renders the §0a-7 branch.
 */
export function AdminRoutes(): ReactNode {
  const { parts, slots, requireAuth, childrenStatus } = useAdminUI();
  const { Routes, Route } = useRouterAdapter();
  const gate = useAuthGate(requireAuth);

  const noLayoutCustoms = useMemo(
    () => customRouteChildren(parts.customRoutesWithoutLayout),
    [parts.customRoutesWithoutLayout],
  );

  // The auth-callback route (parity §0a-1/D4). Mounted in EVERY branch's
  // `<Routes>` (like the no-layout customs) so an OAuth landing at
  // `/auth-callback` resolves whether or not the user is authenticated yet — the
  // callback happens BEFORE authentication. Absent slot → no route (the shell's
  // catch-all / login page handles the path as usual). Placed BEFORE the
  // branch's catch-all so the specific path wins.
  const authCallbackRoute =
    slots.authCallback != null ? (
      <Route path="auth-callback" element={slots.authCallback} />
    ) : null;

  // BRANCH 1 — nothing to route (no resources AND no custom routes): the empty
  // state (plan §0a-7). An all-custom-routes app is NOT empty, so with-layout /
  // no-layout customs suppress this branch. Only renders when a `ready` slot is
  // supplied; without one, fall through (the shell renders the catch-all).
  //
  // Emptiness is derived from the SYNCHRONOUS partition (`parts.resources`), NOT
  // the effect-lagged registry (`definitions`, populated by the register effect
  // — B2 fix). ra-core computes emptiness synchronously from the child-walk;
  // reading the registry would FLASH the `ready` slot for one frame on the first
  // render (resources present in `parts` but not yet flushed into the registry).
  const hasResources = parts.resources.length > 0;
  const hasCustomRoutes =
    parts.customRoutesWithLayout.length > 0 ||
    parts.customRoutesWithoutLayout.length > 0;
  if (!hasResources && !hasCustomRoutes && slots.ready != null) {
    return slots.ready;
  }

  // BRANCH 2 — async children resolving OR gate pending: NO-LAYOUT customs +
  // the auth-callback route + the loading page ONLY. The layout tree (and every
  // resource view) does NOT mount — no-flash guarantee. `childrenStatus ===
  // 'loading'` mirrors ra-core's `status === 'loading'` (an async
  // `(permissions) => Promise<node>` child mid-resolve): the resolving children
  // never mount, the loading page shows instead (parity §0a-7/§0a-9).
  if (childrenStatus === "loading" || gate.isPending) {
    return (
      <>
        <ScrollManager />
        <Routes>
          {noLayoutCustoms}
          {authCallbackRoute}
          <Route path="*" element={slots.loading} />
        </Routes>
      </>
    );
  }

  // BRANCH 3 — requireAuth & NOT authenticated: NO-LAYOUT customs + the
  // auth-callback route (OAuth landing is public — it happens pre-auth) + logout.
  if (requireAuth && !gate.authenticated) {
    return (
      <>
        <LogoutOnMount />
        <Routes>
          {noLayoutCustoms}
          {authCallbackRoute}
          <Route path="*" element={slots.loginPage} />
        </Routes>
      </>
    );
  }

  // BRANCH 4 — authenticated / ungated: the no-layout customs first, then the
  // full tree under a splat route. The customs sit ABOVE the `<Layout>`, so a
  // path they own renders without the shell, as in ra-core's `CoreAdminRoutes`.
  return (
    <>
      <ScrollManager />
      <Routes>
        {noLayoutCustoms}
        <Route
          path="*"
          element={
            <HasDashboardContext.Provider value={slots.dashboard != null}>
              <ShellErrorBoundary fallback={slots.error}>
                <Layout layout={slots.layout}>
                  <FullRoutes
                    parts={parts}
                    slots={slots}
                    Routes={Routes}
                    Route={Route}
                  />
                </Layout>
              </ShellErrorBoundary>
            </HasDashboardContext.Provider>
          }
        />
      </Routes>
    </>
  );
}

/**
 * The engine for `<Admin routes={false}>`: the same `ready`, pending and
 * logged-out branches as `AdminRoutes`, with no route table. The host app owns
 * every URL, so the authenticated branch renders the layout around the adapter's
 * `<Outlet>`, which shows the host's matched child route. `<CustomRoutes>` and
 * the `authCallback` slot do nothing here: the app routes those paths itself.
 */
export function AdminOutlet(): ReactNode {
  const { parts, slots, requireAuth, childrenStatus } = useAdminUI();
  const { Outlet } = useRouterAdapter();
  const gate = useAuthGate(requireAuth);

  if (parts.resources.length === 0 && slots.ready != null) return slots.ready;

  if (childrenStatus === "loading" || gate.isPending) {
    return (
      <>
        <ScrollManager />
        {slots.loading}
      </>
    );
  }

  if (requireAuth && !gate.authenticated) {
    return (
      <>
        <LogoutOnMount />
        {slots.loginPage}
      </>
    );
  }

  return (
    <>
      <ScrollManager />
      {/* No route renders the dashboard here, so the menu gets no entry for it. */}
      <HasDashboardContext.Provider value={false}>
        <ShellErrorBoundary fallback={slots.error}>
          <Layout layout={slots.layout}>
            <Outlet />
          </Layout>
        </ShellErrorBoundary>
      </HasDashboardContext.Provider>
    </>
  );
}

/**
 * The authenticated route table (plan §0a-7/§0a-10). Order: layout customs →
 * resources → index → auth-error → access-denied → catch-all (LAST).
 */
function FullRoutes({
  parts,
  slots,
  Routes,
  Route,
}: {
  parts: PartitionedChildren;
  slots: AdminSlots;
  Routes: ReturnType<typeof useRouterAdapter>["Routes"];
  Route: ReturnType<typeof useRouterAdapter>["Route"];
}): ReactNode {
  const layoutCustoms = useMemo(
    () => customRouteChildren(parts.customRoutesWithLayout),
    [parts.customRoutesWithLayout],
  );
  const resourceRouteEls = useMemo(
    () => resourceRoutes(parts.resources, Route),
    [parts.resources, Route],
  );

  return (
    <Routes>
      {/* The auth-callback route is public/auth-agnostic (parity §0a-1/D4):
          mounted here too so a settled/authenticated OAuth landing resolves. */}
      {slots.authCallback != null ? (
        <Route path="auth-callback" element={slots.authCallback} />
      ) : null}
      {/* Layout customs BEFORE resources so an app can override a path. */}
      {layoutCustoms}
      {resourceRouteEls}
      <Route index element={indexElement(slots)} />
      {slots.authenticationError != null ? (
        <Route
          path="authentication-error"
          element={slots.authenticationError}
        />
      ) : null}
      {slots.accessDenied != null ? (
        <Route path="access-denied" element={slots.accessDenied} />
      ) : null}
      <Route path="*" element={slots.catchAll} />
    </Routes>
  );
}

/**
 * Wrap the authenticated content in the `layout` slot (plan §0a-7: "Layout
 * wrapping Routes"). When the layout slot is a single React ELEMENT (the common
 * case — `<Admin.Layout><MyLayout/></Admin.Layout>` or a layout component), the
 * routes are injected as its `children` via `cloneElement`, so `MyLayout` renders
 * its chrome around the route content — the ra-core `<Layout>{children}</Layout>`
 * shape. When no layout slot is given, the routes render directly (headless
 * default; the shadcn `<Layout>` lands in P7). A non-element layout node (a
 * fragment / array) is rendered alongside the routes as a last resort.
 */
function Layout({
  layout,
  children,
}: {
  layout: ReactNode;
  children: ReactNode;
}): ReactNode {
  if (layout == null) return children;
  if (isValidElement(layout)) {
    // Inject the routes as the layout element's children (ra-core parity).
    return cloneElement(layout, undefined, children);
  }
  return (
    <>
      {layout}
      {children}
    </>
  );
}
