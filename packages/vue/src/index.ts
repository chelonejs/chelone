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
// --- array-input slice (iterator machinery consumed by array inputs) -------
export type {
  ArrayFieldState,
  ArrayInputContextValue,
  IteratorItem,
  UseArrayInputOptions,
  UseArrayInputResult,
} from "./array";
export {
  ArrayInputContextKey,
  IteratorRowContextKey,
  provideArrayInput,
  provideIteratorRow,
  useArrayInput,
  useIteratorItem,
} from "./array";
// --- choices slice (shared choice machinery consumed by choice inputs) -----
export type {
  ChoiceRecord,
  ChoicesContextValue,
  InlineChoicesConfig,
  OptionText,
  UseChoicesContextOptions,
  UseChoicesOptions,
  UseChoicesResult,
  UseReferenceInputOptions,
  UseReferenceInputResult,
} from "./choices";
export {
  ChoicesContextKey,
  getChoicePath,
  provideChoicesContext,
  synthesizeInlineChoices,
  useChoices,
  useChoicesContext,
  useReferenceInput,
} from "./choices";
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
export { useUpdate } from "./data/mutations";
export { useGetList, useGetMany, useGetOne } from "./data/queries";
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
export { humanize, pluralize } from "./label/inflection";
export type { GetRecordRepresentation } from "./label/use-get-record-representation";
export { useGetRecordRepresentation } from "./label/use-get-record-representation";
export type { GetResourceLabel } from "./label/use-get-resource-label";
export { useGetResourceLabel } from "./label/use-get-resource-label";
export { areIdsEqual } from "./lib/are-ids-equal";
export { shallowEqual } from "./lib/shallow-equal";
export { cn } from "./lib/utils";
export type { ListContextValue } from "./list/list-context";
export {
  ListContextKey,
  provideListContext,
  useListContext,
} from "./list/list-context";
export type { UseListOptions } from "./list/use-list";
export { useList } from "./list/use-list";
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
