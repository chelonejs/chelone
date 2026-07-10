// @chelone/vue — Vue 3 adapter over the framework-agnostic @chelone/core.
//
// Boundary discipline (mirrors the core Biome rule, extended to this package):
// @chelone/vue may import `vue` / `vue-router` / `@tanstack/vue-*` /
// `@chelone/core` ONLY — NEVER `react` / `react-dom` / `@chelone/react`.
// Everything the adapter subscribes *to* lives in core; the adapter only owns
// *how* it subscribes (a shallowRef + MicroStore.subscribe + onScopeDispose
// bridge). The barrel fills in as V1 tasks land (store bridge, router adapter,
// <Admin>/<Resource>, controllers, form, components).
export { useStore, useStoreSelector } from "./store/use-store";
