/**
 * Public router surface for `@chelone/vue` (V1-a Task 3): the `RouterAdapter`
 * interface + injection keys, the default `vueRouterAdapter` / its installer,
 * and the bridged navigation composables. The Vue twin of
 * `packages/react/src/router/index.ts`.
 */

export type {
  AdapterNavigate,
  AdapterNavigateOpts,
  RouterAdapter,
  UseMatchArgs,
} from "./adapter";
export {
  BasenameKey,
  RouterAdapterKey,
  useBasename,
  useRouterAdapter,
  useRouterAdapterOptional,
} from "./adapter";
export type { Redirect, RedirectTo } from "./nav-composables";
export {
  useCreatePath,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
  useRedirect,
  useRedirectOptional,
} from "./nav-composables";
export type {
  LinkToType,
  UseGetPathForRecordOptions,
} from "./use-get-path-for-record";
export { useGetPathForRecord } from "./use-get-path-for-record";
export {
  provideVueRouterAdapter,
  vueRouterAdapter,
} from "./vue-router-adapter";
