<script lang="ts">
/** Props for {@link Admin}. */
export interface AdminProps<TResources extends ResourceMap = ResourceMap> {
  /** The data provider (required — the P2 data seam). */
  dataProvider: DataProvider<TResources>;
  /** An existing vue-query client. Omit to have `<Admin>` create one. */
  queryClient?: QueryClient;
  /**
   * The path the host mounts `<Admin>` at, relative to the host router's own
   * history base (default `''`). Starts with a slash when non-empty. Chelone
   * prepends it to links and resource routes; vue-router applies its history
   * base separately. Remount `<Admin>` to change it.
   */
  basename?: string;
  /** The optional auth provider. */
  authProvider?: AuthProvider;
  /** The optional i18n instance. */
  i18n?: AnyCheloneI18n;
  /** The optional KV store. */
  store?: CheloneStore;
  /** The optional notification store. */
  notifications?: NotificationStore;
  /**
   * The zod resource registry (P5), the output of `defineResources(...)`. Named
   * `registry` to avoid colliding with the `resources` view-component escape
   * hatch below. When present, a resource's schema becomes the DEFAULT form
   * validator for `useForm({ resource })` (D6): the core save-pipeline and
   * `useForm` already READ `ctx.resources` — `<Admin>` is what PUTS it there,
   * the exact seam React's `<Admin resources>` threads through `<CheloneProvider>`.
   */
  registry?: TResources;
  /**
   * The escape hatch (D3): resource definitions to merge into the registry
   * WITHOUT a `<Resource>` child — the config path mirroring React's array form.
   * NOTE: this is the runtime VIEW registry (list/edit/create components), NOT
   * the zod schema registry — that is `registry` above.
   */
  resources?: ResourceDefinition[];
  /**
   * Gate the shell behind authentication (the no-flash auth gate). When `true`
   * (and an `authProvider` is configured), the shell renders a loading spinner
   * while the auth check is pending and the `#login` slot (default
   * `<LoginPage>`) when unauthenticated — the protected layout never mounts
   * during that window. Defaults `false`: the shell renders immediately, exactly
   * as before (parity with React's `<Admin requireAuth>`).
   */
  requireAuth?: boolean;
}
</script>

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

import {
  type AnyCheloneI18n,
  type AuthProvider,
  type CheloneStore,
  type DataProvider,
  joinBasename,
  type NotificationStore,
  type ResourceMap,
} from "@chelone/core";
import { BasenameKey } from "../router/adapter";
import { QueryClient, VUE_QUERY_CLIENT } from "@tanstack/vue-query";
import { onScopeDispose, provide, useSlots, watchEffect } from "vue";
import { useRouter } from "vue-router";
import AdminShell from "./admin-shell.vue";
import { provideCheloneContext } from "../context";
import { provideVueRouterAdapter } from "../router/vue-router-adapter";
import { provideHasDashboard } from "./has-dashboard";
import {
  createResourceRegistry,
  type ResourceDefinition,
  ResourceRegistryKey,
} from "./resource-registry";

const props = defineProps<AdminProps<TResources>>();
const basename = props.basename ?? "";
provide(BasenameKey, basename);

defineSlots<{
  /** The resource markers (`<Resource>`) — always rendered so they register. */
  default?: () => unknown;
  /** Override the default shell chrome (wins over the route view). */
  layout?: () => unknown;
  /** The index/dashboard content (rendered before the route view by default). */
  dashboard?: () => unknown;
  /** The unauthenticated login screen (`requireAuth`) — default `<LoginPage>`. */
  login?: () => unknown;
}>();

// --- Seam 1: the reactive resource registry -------------------------------
const registry = createResourceRegistry();
provide(ResourceRegistryKey, registry);
// Escape hatch: merge the `:resources` array into the registry up front.
if (props.resources) {
  for (const definition of props.resources) registry.register(definition);
}

// Provide whether a `#dashboard` slot was given so the sidebar `<Menu>` renders
// a "Dashboard" entry ONLY when a dashboard exists (parity with React's
// `HasDashboardContext`). Slot presence is stable per mount.
provideHasDashboard(useSlots().dashboard != null);

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
  // Thread the zod registry so `useForm({ resource })` auto-resolves the
  // resource schema as its default validator (the V1-b wiring gap this closes).
  resources: props.registry,
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
        path: joinBasename(`/${name}/create`, basename),
        name: `chelone-${name}-create`,
        component: definition.create,
      }),
    );
  }
  if (definition.show) {
    removers.push(
      router.addRoute({
        path: joinBasename(`/${name}/:id/show`, basename),
        name: `chelone-${name}-show`,
        component: definition.show,
      }),
    );
  }
  if (definition.edit) {
    removers.push(
      router.addRoute({
        path: joinBasename(`/${name}/:id`, basename),
        name: `chelone-${name}-edit`,
        component: definition.edit,
      }),
    );
  }
  if (definition.list) {
    removers.push(
      router.addRoute({
        path: joinBasename(`/${name}`, basename),
        name: `chelone-${name}-list`,
        component: definition.list,
      }),
    );
  }
  return removers;
}

/** True while a re-resolve is waiting on `router.isReady()`, so one replace serves all callers. */
let resolving = false;

/**
 * vue-router resolves its first location when the app installs it, before any
 * resource route exists, so a deep link matches nothing. Once the router is
 * ready, replace an unmatched location with itself so it resolves against the
 * routes added since. A failed first navigation rejects `isReady()` and is left alone.
 */
async function resolveWaitingLocation() {
  if (resolving) return;
  resolving = true;
  try {
    await router.isReady();
  } catch {
    return;
  } finally {
    resolving = false;
  }
  const current = router.currentRoute.value;
  // The index is left alone: `<NavigateToFirstResource>` redirects it, and
  // re-resolving "/" would cancel that redirect's pending navigation.
  if (current.matched.length === 0 && current.path !== "/") {
    void router.replace(current.fullPath);
  }
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
  let added = false;
  for (const name of names) {
    if (routeRemovers.has(name)) continue;
    const definition = definitions[name];
    if (!definition) continue;
    routeRemovers.set(name, addResourceRoutes(name, definition));
    added = true;
  }

  if (added) void resolveWaitingLocation();
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
  <!-- The shell + auth gate live in <AdminShell>, rendered INSIDE this provided
       context so its auth composables can inject the Chelone context + query
       client. #layout / #dashboard / #login are forwarded through (each only
       when given, so the shell's own fallbacks apply otherwise). -->
  <AdminShell :require-auth="props.requireAuth ?? false">
    <template v-if="$slots.layout" #layout><slot name="layout" /></template>
    <template v-if="$slots.dashboard" #dashboard><slot name="dashboard" /></template>
    <template v-if="$slots.login" #login><slot name="login" /></template>
  </AdminShell>
</template>
