// A subpath entry, not part of the barrel: the adapter imports the optional
// `@tanstack/react-router` peer, which the main entry must load without.

export type {
  RedirectAuthenticatedBeforeLoadOptions,
  RequireAuthBeforeLoadOptions,
} from "./router/tanstack-route-auth";
export {
  redirectAuthenticatedBeforeLoad,
  requireAuthBeforeLoad,
} from "./router/tanstack-route-auth";
export { tanstackRouterAdapter } from "./router/tanstack-router-adapter";
