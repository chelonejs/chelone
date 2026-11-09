/**
 * Public admin-shell surface for `@chelone/react` (P6 W1-T6/T7): the
 * children-composable `<Admin>` façade, its low-level `<AdminContext>` +
 * `<AdminUI>` escape-hatch split, the page-slot markers + `<CustomRoutes>`, the
 * children partition, and the routing engine (`AdminRoutes` + the no-flash auth
 * gate + the shell error boundary + scroll — W1-T7).
 */

export type { AdminProps } from "./admin";
export { Admin } from "./admin";
export type { AdminContextProps } from "./admin-context";
export { AdminContext } from "./admin-context";
export {
  AdminOutlet,
  AdminRoutes,
  NavigateToFirstResource,
} from "./admin-routes";
export type {
  AdminSlotProps,
  AdminUIContent,
  AdminUIProps,
} from "./admin-ui";
export { AdminUI, useAdminUI } from "./admin-ui";
export type {
  AuthenticatedProps,
  AuthGateState,
  HandleAuthCallbackResult,
  UseAuthenticatedOptions,
} from "./auth-gate";
export {
  Authenticated,
  LogoutOnMount,
  useAuthenticated,
  useAuthGate,
  useHandleAuthCallback,
} from "./auth-gate";
export type {
  ErrorFallbackProps,
  ShellErrorBoundaryProps,
} from "./error-boundary";
export { DefaultErrorFallback, ShellErrorBoundary } from "./error-boundary";
export { HasDashboardContext, useHasDashboard } from "./has-dashboard";
export type {
  AdminChildren,
  AdminChildrenStatus,
  AdminSlots,
  PartitionedChildren,
  UseAdminChildrenResult,
  UseResolvedChildrenResult,
} from "./partition";
export {
  partitionChildren,
  useAdminChildren,
  useResolvedChildren,
} from "./partition";
export type { RestoreScrollPositionProps } from "./scroll";
export { RestoreScrollPosition, useScrollToTop } from "./scroll";
export type {
  CustomRoutesComponent,
  CustomRoutesName,
  CustomRoutesProps,
  SlotComponent,
  SlotElement,
  SlotName,
  SlotProps,
} from "./slots";
export {
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
