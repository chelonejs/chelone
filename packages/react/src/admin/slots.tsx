/**
 * `<Admin>` page-slot markers + `<CustomRoutes>` (plan §2 W1-T6, parity §0a-9).
 *
 * Each slot is a MARKER: it carries a static `chelName` the children partition
 * (`partitionChildren`) buckets on, and — rendered directly — returns `null`.
 * A slot never renders its own content; the shell (`<AdminUI>` / the W1-T7
 * routing engine) reads the hoisted child out of the partition and places it in
 * the right spot (the layout wraps content, the dashboard is the index route,
 * the catch-all is the fallback route, …). This mirrors ra-core, where
 * `<CustomRoutes>` / the page components are hoisted, not rendered where they
 * sit.
 *
 * `<CustomRoutes>` is the one slot that ALSO takes a behavioral prop: `noLayout`
 * splits it into the with-layout bucket (rendered inside `<Layout>`) vs the
 * without-layout bucket (rendered standalone, auth-agnostic — parity §0a-10).
 *
 * The page-slot props are accepted on `<Admin>` too (`dashboard={…}` etc.);
 * that PROP wins over the matching child (the escape hatch — see `admin.tsx`).
 */

import type { ReactElement, ReactNode } from "react";

/** The literal `chelName` markers the partition buckets a slot on. */
export type SlotName =
  | "Admin.Title"
  | "Admin.Layout"
  | "Admin.LoginPage"
  | "Admin.Dashboard"
  | "Admin.CatchAll"
  | "Admin.Error"
  | "Admin.Ready"
  | "Admin.AuthCallback"
  | "Admin.Loading"
  | "Admin.AccessDenied"
  | "Admin.AuthenticationError";

/** Props every page-slot marker accepts: the content the shell later renders. */
export interface SlotProps {
  children?: ReactNode;
}

/** A slot component: a marker function with its static partition key attached. */
export interface SlotComponent {
  (props: SlotProps): ReactNode;
  /** The static marker the children partition buckets on. */
  readonly chelName: SlotName;
}

/**
 * Build a page-slot marker. Rendered directly it is inert (`null`) — the shell
 * reads the hoisted child from the partition, so a slot placed anywhere in the
 * children lands in the right shell position regardless of source order.
 */
function createSlot(chelName: SlotName): SlotComponent {
  const Slot = ((_props: SlotProps): ReactNode => null) as SlotComponent;
  Object.defineProperty(Slot, "chelName", { value: chelName });
  Object.defineProperty(Slot, "displayName", { value: chelName });
  return Slot;
}

/** The app title (menu / document heading). */
export const AdminTitle: SlotComponent = createSlot("Admin.Title");
/** The chrome (menu + app bar) wrapping authenticated content. */
export const AdminLayout: SlotComponent = createSlot("Admin.Layout");
/** The login page (rendered no-layout while unauthenticated). */
export const AdminLoginPage: SlotComponent = createSlot("Admin.LoginPage");
/** The index route's dashboard (else redirect to the first resource). */
export const AdminDashboard: SlotComponent = createSlot("Admin.Dashboard");
/** The catch-all (404) route, last in the route list. */
export const AdminCatchAll: SlotComponent = createSlot("Admin.CatchAll");
/** The shell error boundary's fallback (overrides the default). */
export const AdminError: SlotComponent = createSlot("Admin.Error");
/** The empty-state page shown when NO resources are registered. */
export const AdminReady: SlotComponent = createSlot("Admin.Ready");
/** The OAuth auth-callback page (no-layout). */
export const AdminAuthCallback: SlotComponent =
  createSlot("Admin.AuthCallback");
/** The loading page shown during the pending-auth window (no-flash gate). */
export const AdminLoading: SlotComponent = createSlot("Admin.Loading");
/** The access-denied page (a resolved-but-forbidden route). */
export const AdminAccessDenied: SlotComponent =
  createSlot("Admin.AccessDenied");
/** The authentication-error page (auth check itself failed). */
export const AdminAuthenticationError: SlotComponent = createSlot(
  "Admin.AuthenticationError",
);

/** The literal `chelName` for the custom-routes marker. */
export type CustomRoutesName = "CustomRoutes";

export interface CustomRoutesProps {
  /**
   * When true these routes render STANDALONE (outside `<Layout>`, auth-agnostic
   * — parity §0a-10): login-adjacent pages, public pages. When false/omitted
   * they render inside `<Layout>` (can override resource paths by order).
   */
  noLayout?: boolean;
  /** The `<Route>` elements (or a fragment of them). */
  children?: ReactNode;
}

/** `<CustomRoutes>` component + its static partition key. */
export interface CustomRoutesComponent {
  (props: CustomRoutesProps): ReactNode;
  readonly chelName: CustomRoutesName;
}

/**
 * Group extra `<Route>`s into the shell. A marker like the page slots: rendered
 * directly it is inert; the partition buckets it (by `noLayout`) and the shell
 * mounts its children in the right branch. `noLayout` customs render in ALL
 * branches (even while unauthenticated); with-layout customs render inside
 * `<Layout>` before the resources (parity §0a-10).
 */
const CustomRoutesImpl = ((_props: CustomRoutesProps): ReactNode =>
  null) as CustomRoutesComponent;
Object.defineProperty(CustomRoutesImpl, "chelName", { value: "CustomRoutes" });
Object.defineProperty(CustomRoutesImpl, "displayName", {
  value: "CustomRoutes",
});

export const CustomRoutes: CustomRoutesComponent = CustomRoutesImpl;

/**
 * The element shape a bucketed slot / custom-route carries (an element whose
 * `type` is one of the markers above). Kept as `ReactElement` — the partition
 * narrows on the runtime `chelName`, not this compile-time type.
 */
export type SlotElement = ReactElement;
