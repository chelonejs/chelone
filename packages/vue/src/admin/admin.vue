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
   * base separately. Trailing slashes are removed. Remount `<Admin>` to change it.
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
   * Extra routes mounted under `basename`, ahead of any resource route, so one at
   * a resource's path wins. A `noLayout` route renders outside the layout and the
   * auth gate; the rest render inside the layout, behind the gate. Read once at setup.
   */
  customRoutes?: CustomRoute[];
  /**
   * Gate the shell behind authentication (the no-flash auth gate). When `true`
   * (and an `authProvider` is configured), the shell renders a loading spinner
   * while the auth check is pending and the `#login` slot (default
   * `<LoginPage>`) when unauthenticated — the protected layout never mounts
   * during that window. Defaults `false`: the shell renders immediately, exactly
   * as before (parity with React's `<Admin requireAuth>`).
   */
  requireAuth?: boolean;
  /**
   * Add the admin's own routes (default `true`): one per resource view, each
   * `customRoutes` entry and each page slot. Pass `false` when the app routes its
   * own URLs: `<Admin>` then adds no route and renders the layout around the
   * `<router-view>` the host's matched child route fills. `<Resource>` children
   * still register, so the menu and links work, but their views are not mounted.
   * `customRoutes` and `#authCallback` do nothing. Read once at setup.
   */
  routes?: boolean;
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
 *    route records (`/{name}`, `/{name}/create/:pathMatch(.*)*`,
 *    `/{name}/:id/:pathMatch(.*)*`, `/{name}/:id/show/:pathMatch(.*)*`) as resources register/unregister — the reactive analog
 *    of React's declarative `<AdminRoutes>` resource route table. vue-router
 *    ranks by specificity, so a static `create` or `show` route naturally beats
 *    the `:id` edit route without a hand-maintained declaration order. The
 *    edit, create and show routes take a trailing catch-all so a `<TabbedForm>`
 *    or `<TabbedShowLayout>` tab can live in the URL.
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
  createI18n,
  type DataProvider,
  englishMessages,
  joinBasename,
  type NotificationStore,
  type ResourceMap,
} from "@chelone/core";
import { BasenameKey } from "../router/adapter";
import { QueryClient, VUE_QUERY_CLIENT } from "@tanstack/vue-query";
import {
  onBeforeUpdate,
  onScopeDispose,
  provide,
  useSlots,
  type VNode,
  watchEffect,
} from "vue";
import { START_LOCATION, useRouter } from "vue-router";
import AdminShell from "./admin-shell.vue";
import type { ErrorFallbackProps } from "./default-error-fallback.vue";
import { provideCheloneContext } from "../context";
import { type CustomRoute, toRouteRecord } from "./custom-routes";
import { resourceView } from "./resource-view";
import { CATCH_ALL_META, createSlotRoutes } from "./slot-routes";
import { provideVueRouterAdapter } from "../router/vue-router-adapter";
import { provideHasDashboard } from "./has-dashboard";
import {
  createResourceRegistry,
  type ResourceDefinition,
  ResourceRegistryKey,
} from "./resource-registry";

const props = withDefaults(defineProps<AdminProps<TResources>>(), {
  routes: true,
});
const routed = props.routes;
const basename = (props.basename ?? "").replace(/\/+$/, "");
provide(BasenameKey, basename);

defineSlots<{
  /** The resource markers (`<Resource>`) — always rendered so they register. */
  default?: () => VNode[];
  /** Override the default shell chrome (wins over the route view). */
  layout?: () => VNode[];
  /** The index/dashboard content (rendered before the route view by default). */
  dashboard?: () => VNode[];
  /** The unauthenticated login screen (`requireAuth`) — default `<LoginPage>`. */
  login?: () => VNode[];
  /** Replaces the spinner shown while the `requireAuth` check is pending. */
  loading?: () => VNode[];
  /** Rendered alone when no resource is registered and no `customRoutes` are given. */
  ready?: () => VNode[];
  /** Replaces the default fallback shown when a route view throws. */
  error?: (props: ErrorFallbackProps) => VNode[];
  /** Mounted at `/auth-callback`, outside the layout and the auth gate. */
  authCallback?: () => VNode[];
  /** Mounted at `/authentication-error`, inside the layout. */
  authenticationError?: () => VNode[];
  /** Mounted at `/access-denied`, inside the layout. */
  accessDenied?: () => VNode[];
  /** Mounted for any path no other route owns, inside the layout. */
  catchAll?: () => VNode[];
}>();

const slots = useSlots();

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
provideHasDashboard(routed && slots.dashboard != null);

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
  // Built once, and only when the app brings no i18n of its own.
  i18n:
    props.i18n ??
    createI18n({ locale: "en", messages: { en: englishMessages } }),
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
        path: joinBasename(`/${name}/create/:pathMatch(.*)*`, basename),
        name: `chelone-${name}-create`,
        component: resourceView(name, definition.create),
      }),
    );
  }
  if (definition.show) {
    removers.push(
      router.addRoute({
        path: joinBasename(`/${name}/:id/show/:pathMatch(.*)*`, basename),
        name: `chelone-${name}-show`,
        component: resourceView(name, definition.show),
      }),
    );
  }
  if (definition.edit) {
    removers.push(
      router.addRoute({
        path: joinBasename(`/${name}/:id/:pathMatch(.*)*`, basename),
        name: `chelone-${name}-edit`,
        component: resourceView(name, definition.edit),
      }),
    );
  }
  if (definition.list) {
    removers.push(
      router.addRoute({
        path: joinBasename(`/${name}`, basename),
        name: `chelone-${name}-list`,
        component: resourceView(name, definition.list),
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
  const indexPath = joinBasename("/", basename).toLowerCase();
  const currentPath = current.path.toLowerCase();
  // The index is left alone: `<NavigateToFirstResource>` redirects it, and
  // re-resolving the basename root would cancel that pending navigation.
  // A `#catchAll` match is as good as none: a resource may have registered since.
  if (
    current.matched.every((record) => record.meta[CATCH_ALL_META] === true) &&
    currentPath !== indexPath &&
    currentPath !== `${indexPath}/`
  ) {
    void router.replace(current.fullPath);
  }
}

/**
 * A slot route added or removed can change what the current location matches:
 * a removed record stays in `currentRoute` and would keep mounting a page that
 * renders nothing. Replace the location with itself when it now resolves to a
 * different record. Before the first navigation settles there is nothing to redo.
 */
function resolveCurrentLocationAgain() {
  const current = router.currentRoute.value;
  if (current === START_LOCATION) return;
  const next = router.resolve(current.fullPath);
  if (next.matched.at(-1) !== current.matched.at(-1)) {
    void router.replace(current.fullPath);
  }
}

// Added before any resource route: vue-router ranks equal paths by insertion
// order, so a custom route at a resource's path wins.
for (const route of routed ? (props.customRoutes ?? []) : []) {
  onScopeDispose(router.addRoute(toRouteRecord(route, basename)));
}
// Page slots add a route only when given. `#catchAll` ranks after every other
// route by specificity, and a host catch-all added earlier still wins. A slot
// that appears or goes after mount adds or removes its route on the next update.
const slotRoutes = createSlotRoutes(router, routed ? slots : {}, basename);
onScopeDispose(slotRoutes.dispose);
const hasSlotRoutes = slotRoutes.sync();
onBeforeUpdate(() => {
  if (routed && slotRoutes.sync()) resolveCurrentLocationAgain();
});
// An admin with only custom or slot routes registers no resource, so nothing
// else re-resolves a deep link to one.
if (routed && (props.customRoutes?.length || hasSlotRoutes))
  void resolveWaitingLocation();

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
    routeRemovers.set(name, routed ? addResourceRoutes(name, definition) : []);
    added = routed;
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
       client. #layout / #dashboard / #login / #loading / #ready are forwarded through (each only
       when given, so the shell's own fallbacks apply otherwise). -->
  <AdminShell
    :require-auth="props.requireAuth ?? false"
    :has-custom-routes="routed && !!props.customRoutes?.length"
    :routes="routed"
  >
    <template v-if="$slots.layout" #layout><slot name="layout" /></template>
    <template v-if="$slots.dashboard" #dashboard><slot name="dashboard" /></template>
    <template v-if="$slots.login" #login><slot name="login" /></template>
    <template v-if="$slots.loading" #loading><slot name="loading" /></template>
    <template v-if="$slots.ready" #ready><slot name="ready" /></template>
    <template v-if="$slots.error" #error="errorProps"><slot name="error" v-bind="errorProps" /></template>
  </AdminShell>
</template>
