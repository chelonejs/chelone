/**
 * Public router surface for `@chelone/react` (P6 W1-T3): the `RouterAdapter`
 * interface + injection context, the default `reactRouterAdapter`, the app
 * basename context, and the bridged navigation hooks. The TanStack reference
 * adapter (W1-T4) is not here: it imports the optional `@tanstack/react-router`
 * peer, so it ships from `@chelone/react/tanstack-router`.
 */

export type {
  AdapterIndexRouteProps,
  AdapterLinkProps,
  AdapterNavigate,
  AdapterNavigateProps,
  AdapterPathRouteProps,
  AdapterRouteProps,
  AdapterRoutesProps,
  RouterAdapter,
  RouterAdapterProviderProps,
  RouterBlocker,
  RouterWrapperProps,
  UseMatchArgs,
} from "./adapter";
export {
  RouterAdapterContext,
  RouterAdapterProvider,
  useRouterAdapter,
} from "./adapter";
export type { BasenameProviderProps } from "./context";
export { BasenameContext, BasenameProvider } from "./context";
export type {
  BlockerPredicate,
  LinkToType,
  Redirect,
  RedirectTo,
  UseGetPathForRecordOptions,
} from "./nav-hooks";
export {
  useBasename,
  useBlocker,
  useCanBlock,
  useCreatePath,
  useGetPathForRecord,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
  useRedirect,
  useRedirectOptional,
  useRevalidate,
} from "./nav-hooks";
export { reactRouterAdapter } from "./react-router-adapter";
