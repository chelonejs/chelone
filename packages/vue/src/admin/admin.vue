<script setup lang="ts" generic="TResources extends ResourceMap = ResourceMap">
/**
 * `<Admin>` — the children-composable façade (D3), the Vue twin of
 * `@chelone/react`'s `<Admin>` (`packages/react/src/admin/admin.tsx` +
 * `admin-context.tsx`). Provider config = props; page overrides = named slots;
 * resources = composed `<Resource>` children (or the `:resources` escape hatch).
 *
 * It owns four seams, each the Vue idiom of a React provider:
 * 1. **The reactive registry.** Creates one `ResourceRegistry` and `provide`s it
 *    so child `<Resource>`s self-register (the Vue mirror of React's
 *    `<ResourceRegistryProvider>` + register-on-mount effect).
 * 2. **The Chelone context.** `provide`s the same value React's `CheloneProvider`
 *    builds (dataProvider / queryClient / store / i18n / auth / notifications) so
 *    every data/i18n composable below reads it — "reuse core's context
 *    construction, same as React's `<Admin>`".
 * 3. **The query client.** Resolves (or creates) a vue-query `QueryClient`,
 *    `mount`s it, and `provide`s it under vue-query's own key — the analog of
 *    React's `<QueryClientProvider>`.
 * 4. **The router adapter + reactive route build.** Installs the vue-router
 *    adapter and, via a `watchEffect` over the registry, adds/removes vue-router
 *    route records (`/{name}`, `/{name}/create`, `/{name}/:id`,
 *    `/{name}/:id/show`) as resources register/unregister — the reactive analog
 *    of React's declarative `<AdminRoutes>` resource route table. vue-router
 *    ranks by specificity, so a static `create` route naturally beats the `:id`
 *    edit route without a hand-maintained declaration order.
 *
 * Named slots `#layout` / `#dashboard` override the default shell; `#login` is
 * reserved for the auth gate (a later V1 wave). The `#layout` slot, when given,
 * WINS over the default chrome (its fallback is the route view). The default
 * slot always renders — that is where `<Resource>` markers live and register.
 */

import type {
  AnyChelonI18n,
  AuthProvider,
  ChelonStore,
  DataProvider,
  NotificationStore,
  ResourceMap,
} from "@chelone/core";
import { QueryClient, VUE_QUERY_CLIENT } from "@tanstack/vue-query";
import { onScopeDispose, provide, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { provideCheloneContext } from "../context";
import { provideVueRouterAdapter } from "../router/vue-router-adapter";
import {
  createResourceRegistry,
  type ResourceDefinition,
  ResourceRegistryKey,
} from "./resource-registry";

const props = defineProps<{
  /** The data provider (required — the P2 data seam). */
  dataProvider: DataProvider<TResources>;
  /** An existing vue-query client. Omit to have `<Admin>` create one. */
  queryClient?: QueryClient;
  /** The optional auth provider. */
  authProvider?: AuthProvider;
  /** The optional i18n instance. */
  i18n?: AnyChelonI18n;
  /** The optional KV store. */
  store?: ChelonStore;
  /** The optional notification store. */
  notifications?: NotificationStore;
  /**
   * The escape hatch (D3): resource definitions to merge into the registry
   * WITHOUT a `<Resource>` child — the config path mirroring React's array form.
   */
  resources?: ResourceDefinition[];
}>();

defineSlots<{
  /** The resource markers (`<Resource>`) — always rendered so they register. */
  default?: () => unknown;
  /** Override the default shell chrome (wins over the route view). */
  layout?: () => unknown;
  /** The index/dashboard content (rendered before the route view by default). */
  dashboard?: () => unknown;
  /** Reserved for the auth gate (a later V1 wave). */
  login?: () => unknown;
}>();

// --- Seam 1: the reactive resource registry -------------------------------
const registry = createResourceRegistry();
provide(ResourceRegistryKey, registry);
// Escape hatch: merge the `:resources` array into the registry up front.
if (props.resources) {
  for (const definition of props.resources) registry.register(definition);
}

// --- Seam 3: the vue-query client -----------------------------------------
const queryClient = props.queryClient ?? new QueryClient();
queryClient.mount();
provide(VUE_QUERY_CLIENT, queryClient);
onScopeDispose(() => queryClient.unmount());

// --- Seam 2: the Chelone (core) context -----------------------------------
provideCheloneContext({
  dataProvider: props.dataProvider,
  queryClient,
  authProvider: props.authProvider,
  i18n: props.i18n,
  store: props.store,
  notifications: props.notifications,
});

// --- Seam 4: the router adapter + reactive route build --------------------
provideVueRouterAdapter();
const router = useRouter();

/** Per-resource route removers (`router.addRoute` returns an unregister fn). */
const routeRemovers = new Map<string, Array<() => void>>();

/** Build the (up to four) route records for one resource; return their removers. */
function addResourceRoutes(
  name: string,
  definition: ResourceDefinition,
): Array<() => void> {
  const removers: Array<() => void> = [];
  if (definition.create) {
    removers.push(
      router.addRoute({
        path: `/${name}/create`,
        name: `chelone-${name}-create`,
        component: definition.create,
      }),
    );
  }
  if (definition.show) {
    removers.push(
      router.addRoute({
        path: `/${name}/:id/show`,
        name: `chelone-${name}-show`,
        component: definition.show,
      }),
    );
  }
  if (definition.edit) {
    removers.push(
      router.addRoute({
        path: `/${name}/:id`,
        name: `chelone-${name}-edit`,
        component: definition.edit,
      }),
    );
  }
  if (definition.list) {
    removers.push(
      router.addRoute({
        path: `/${name}`,
        name: `chelone-${name}-list`,
        component: definition.list,
      }),
    );
  }
  return removers;
}

// Reactively reconcile the vue-router table with the registry: reading
// `Object.keys(definitions)` tracks the shallow-reactive key set, so this
// re-runs whenever a `<Resource>` registers or unregisters. Removed resources
// have their routes torn down; newly registered ones get their routes added.
watchEffect(() => {
  const { definitions } = registry;
  const names = new Set(Object.keys(definitions));

  // Tear down routes for resources no longer registered.
  for (const [name, removers] of routeRemovers) {
    if (!names.has(name)) {
      for (const remove of removers) remove();
      routeRemovers.delete(name);
    }
  }

  // Add routes for newly registered resources.
  for (const name of names) {
    if (routeRemovers.has(name)) continue;
    const definition = definitions[name];
    if (!definition) continue;
    routeRemovers.set(name, addResourceRoutes(name, definition));
  }
});

// Remove every added route when the admin scope tears down.
onScopeDispose(() => {
  for (const removers of routeRemovers.values()) {
    for (const remove of removers) remove();
  }
  routeRemovers.clear();
});
</script>

<template>
  <!-- The default slot holds the <Resource> markers; they register and render
       no DOM. It must always render so registration runs. -->
  <slot />
  <!-- The shell: a #layout slot overrides the default chrome; its fallback is
       the dashboard slot + the route view. -->
  <slot name="layout">
    <slot name="dashboard" />
    <router-view />
  </slot>
</template>
