// @chelone/vue — Vue 3 adapter over the framework-agnostic @chelone/core.
//
// Boundary discipline (mirrors the core Biome rule, extended to this package):
// @chelone/vue may import `vue` / `vue-router` / `@tanstack/vue-*` /
// `@chelone/core` ONLY — NEVER `react` / `react-dom` / `@chelone/react`.
// Everything the adapter subscribes *to* lives in core; the adapter only owns
// *how* it subscribes (a shallowRef + MicroStore.subscribe + onScopeDispose
// bridge). The barrel fills in as V1 tasks land (store bridge, router adapter,
// <Admin>/<Resource>, controllers, form, components).

export { default as Admin } from "./admin/admin.vue";
export { default as Resource } from "./admin/resource.vue";
export type {
  ResourceDefinition,
  ResourceRegistry,
} from "./admin/resource-registry";
export {
  createResourceRegistry,
  ResourceRegistryKey,
  useResourceRegistry,
} from "./admin/resource-registry";
// --- component vertical (ui slice + admin SFCs) ---------------------------
export * from "./components";
export type { CheloneContextValue } from "./context";
export {
  CheloneContextKey,
  provideCheloneContext,
  useChelonAuthProvider,
  useCheloneContext,
  useChelonI18n,
  useChelonNotifications,
  useChelonStore,
} from "./context";
export type {
  UseCreateControllerOptions,
  UseCreateControllerReturn,
  UseEditControllerOptions,
  UseEditControllerReturn,
  UseListControllerOptions,
  UseListControllerReturn,
} from "./controllers";
export {
  toControllerContext,
  useCreateController,
  useEditController,
  useListController,
} from "./controllers";
// --- supporting composables the vertical is built on ----------------------
export { useGetList, useGetOne } from "./data/queries";
export type {
  CheloneFormContextValue,
  FormSubmit,
  UseFormOptions,
  UseFormReturn,
  UseInputOptions,
  UseInputReturn,
} from "./form";
export {
  CheloneFormContextKey,
  firstFieldError,
  provideCheloneForm,
  provideSourceScope,
  SourceScopeKey,
  useCheloneFormContext,
  useForm,
  useInput,
  useSourceScope,
  useWrappedSource,
} from "./form";
export type { Translate } from "./i18n/use-translate";
export { useTranslate } from "./i18n/use-translate";
export type { GetRecordRepresentation } from "./label/use-get-record-representation";
export { useGetRecordRepresentation } from "./label/use-get-record-representation";
export { cn } from "./lib/utils";
export type { ListContextValue } from "./list/list-context";
export {
  ListContextKey,
  provideListContext,
  useListContext,
} from "./list/list-context";
export type {
  RecordValue,
  UseRecordContextOptions,
} from "./record/record-context";
export {
  provideRecordContext,
  RecordContextKey,
  useRecordContext,
} from "./record/record-context";
export type { UseFieldValueOptions } from "./record/use-field-value";
export { useFieldValue } from "./record/use-field-value";
export type { UseResourceContextOptions } from "./resource-context";
export {
  provideResourceContext,
  ResourceContextKey,
  useRequiredResource,
  useResourceContext,
} from "./resource-context";
export type {
  AdapterNavigate,
  AdapterNavigateOpts,
  Redirect,
  RedirectTo,
  RouterAdapter,
  UseMatchArgs,
} from "./router";
export {
  BasenameKey,
  provideVueRouterAdapter,
  RouterAdapterKey,
  useBasename,
  useCreatePath,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
  useRedirect,
  useRedirectOptional,
  useRouterAdapter,
  useRouterAdapterOptional,
  vueRouterAdapter,
} from "./router";
export { useStore, useStoreSelector } from "./store/use-store";
