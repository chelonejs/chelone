/**
 * A declarative `<Routes>`/`<Route>` matcher over Chelone's own `matchPath`, for
 * an adapter whose router has no children-based route API (TanStack's route
 * tree is pre-built, Next.js routes by folder). Router-free: each adapter hands
 * in its own `useLocation`.
 */

import { matchPath, parseLocation } from "@chelone/core";
import { Fragment, isValidElement, type ReactNode } from "react";
import type { AdapterRouteProps, AdapterRoutesProps } from "./adapter";
import { useBasename } from "./context";

/**
 * A neutral `<Route>` marker. It renders nothing itself — `<Routes>` reads its
 * props to pick the first match. Kept as a component (not a plain object) so the
 * shell writes the same JSX it writes for the react-router adapter.
 */
export function Route(_props: AdapterRouteProps): ReactNode {
  // The element is chosen by the enclosing <Routes>; a stray <Route> renders null.
  return null;
}

/**
 * Walk the `<Route>` children in order and render the FIRST whose `path`
 * matches `pathname` — an index route matches the tree base. First-match order
 * is what lets the shell mount create → show → edit → list so `:id/show` isn't
 * swallowed by the `:id` edit splat (plan §0a-6).
 *
 * This substitutes for react-router's nested `<Routes>`; it handles the shell's
 * flat-per-resource matching, not react-router's full relative-nesting
 * algorithm (bounded per §0b-6).
 */
export function renderFirstMatch(
  children: ReactNode,
  pathname: string,
): ReactNode {
  const routes: AdapterRouteProps[] = [];
  for (const child of toChildArray(children)) {
    if (isValidElement(child) && child.type === Route) {
      // type-escape: an element whose type is `Route` was created with its props.
      routes.push(child.props as AdapterRouteProps);
    }
  }

  for (const route of routes) {
    if (route.index) {
      // An index route matches the tree base (`/` or the wrapper's mount point).
      if (pathname === "/" || pathname === "") return route.element ?? null;
      continue;
    }
    if (route.path == null) continue;
    if (matchPath(route.path, pathname)) return route.element ?? null;
  }
  return null;
}

/** The pathname a `<Routes location>` override names, if any. */
export function overridePathname(
  location: AdapterRoutesProps["location"],
): string | undefined {
  return typeof location === "string"
    ? parseLocation(location).pathname
    : location?.pathname;
}

/** `pathname` with the app's `basename` mount prefix removed. */
export function withoutBasename(pathname: string, basename: string): string {
  if (basename === "") return pathname;
  if (pathname === basename) return "/";
  return pathname.startsWith(`${basename}/`)
    ? pathname.slice(basename.length)
    : pathname;
}

/**
 * What `Routes` renders for an app's own router: its pathname still carries the
 * mount prefix (an `/admin/$` splat route, an `app/admin/[[...slug]]` folder),
 * which a created router strips through its own basename. Remove the
 * `useBasename()` prefix so the shell matches the same pathnames under every
 * adapter. `pathname` is the adapter's current one.
 */
export function useHostRoutes(
  { location, children }: AdapterRoutesProps,
  pathname: string,
): ReactNode {
  const basename = useBasename();
  return renderFirstMatch(
    children,
    withoutBasename(overridePathname(location) ?? pathname, basename),
  );
}

/** Flatten a React children value into a stable array (handles fragments). */
function toChildArray(children: ReactNode): ReactNode[] {
  const out: ReactNode[] = [];
  const walk = (node: ReactNode) => {
    if (Array.isArray(node)) {
      for (const n of node) walk(n);
      return;
    }
    if (isValidElement(node) && node.type === Fragment) {
      // type-escape: a Fragment element's only prop is `children`.
      walk((node.props as { children?: ReactNode }).children);
      return;
    }
    out.push(node);
  };
  walk(children);
  return out;
}
