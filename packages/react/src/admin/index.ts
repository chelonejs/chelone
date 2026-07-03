/**
 * Public admin-shell surface for `@chelone/react` (P6 W1-T6): the
 * children-composable `<Admin>` façade, its low-level `<AdminContext>` +
 * `<AdminUI>` escape-hatch split, the page-slot markers + `<CustomRoutes>`, and
 * the children partition. The routing engine (W1-T7) builds on `<AdminUI>`'s
 * `render` seam + `useAdminUI`.
 */

export type { AdminProps } from "./admin";
export { Admin } from "./admin";
export type { AdminContextProps } from "./admin-context";
export { AdminContext } from "./admin-context";
export type {
  AdminSlotProps,
  AdminUIContent,
  AdminUIProps,
} from "./admin-ui";
export { AdminUI, useAdminUI } from "./admin-ui";
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
