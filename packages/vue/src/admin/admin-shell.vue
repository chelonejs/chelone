<script setup lang="ts">
/**
 * `<AdminShell>` — the internal chrome + auth-gate wrapper `<Admin>` renders
 * INSIDE its own provided context (the Chelone context + vue-query client), so
 * the auth composables it calls can `inject` them. `<Admin>`'s own `setup`
 * cannot call `useAuthGate` directly — a component's `provide` is visible only
 * to descendants, not to its own `inject` calls — so the gate lives here.
 *
 * No-flash gate: when `<Admin requireAuth>` gates, this renders the loading
 * spinner WHILE the auth check is pending and the `#login` slot (default
 * `<LoginPage>`) when unauthenticated — the protected `<Layout>` + `<router-view>`
 * never mount during the pending/unauthenticated window. When `requireAuth` is
 * false (the default) the gate short-circuits to authenticated and this renders
 * exactly the prior default chrome, so the ungated app is unchanged.
 *
 * `ThemeProvider` wraps only the DEFAULT branches (loading / login / layout
 * fallback / noLayout route); a caller-provided `#layout` slot stays bare, preserving the prior
 * `<Admin>` behavior where an override owned its own theming.
 */

import { getLocaleDirection, joinBasename } from "@chelone/core";
import { computed, useSlots, type VNode, watchEffect } from "vue";
import { START_LOCATION, useRoute, useRouter } from "vue-router";
import Layout from "../components/admin/layout/layout.vue";
import ThemeProvider from "../components/admin/layout/theme-provider.vue";
import LoginPage from "../components/admin/auth/login-page.vue";
import Spinner from "../components/ui/spinner.vue";
import { useLocale } from "../i18n/use-locale";
import { useBasename } from "../router/adapter";
import { useWatchDataErrors } from "../auth/permissions-hooks";
import { useAuthGate } from "./auth-gate";
import { NO_LAYOUT_META } from "./custom-routes";
import type { ErrorFallbackProps } from "./default-error-fallback.vue";
import NavigateToFirstResource from "./navigate-to-first-resource.vue";
import { useResourceDefinitions } from "./resource-registry";
import ShellErrorBoundary from "./shell-error-boundary.vue";

const props = defineProps<{
  requireAuth: boolean;
  hasCustomRoutes: boolean;
  /** `false` when the host app routes its own URLs, so nothing redirects the index. */
  routes: boolean;
}>();

defineSlots<{
  /** Override the default shell chrome (wins over the route view). */
  layout?: () => VNode[];
  /** The index/dashboard content (rendered before the route view at the index path only). */
  dashboard?: () => VNode[];
  /** The unauthenticated login screen (default `<LoginPage>`). */
  login?: () => VNode[];
  /** Replaces the spinner shown while the `requireAuth` check is pending. */
  loading?: () => VNode[];
  /** Rendered alone when no resource is registered and no custom route is given. */
  ready?: () => VNode[];
  /** Replaces the default fallback shown when the layout branch throws. */
  error?: (props: ErrorFallbackProps) => VNode[];
}>();

const gate = useAuthGate(props.requireAuth);
const slots = useSlots();

// Match the basename root with vue-router's default case-insensitive rule,
// with or without a trailing slash.
// Before the first navigation settles the router sits on `START_LOCATION`,
// whose path is also `/`, so a deep link would flash the dashboard. `useRoute()`
// wraps the location in a proxy, so compare the router's own object.
const route = useRoute();
const router = useRouter();
const isNoLayout = computed(() => route.meta[NO_LAYOUT_META] === true);
// Read live, so a `<Resource>` that registers later hides `#ready`. A plain
// function, not a `computed`: `useSlots()` is not reactive, so a computed would
// never see `#ready` come or go. The render calls it afresh each time.
const definitions = useResourceDefinitions();
const showReady = () =>
  slots.ready != null &&
  !props.hasCustomRoutes &&
  Object.keys(definitions).length === 0;
const indexPath = joinBasename("/", useBasename()).toLowerCase();
const isIndex = computed(() => {
  const path = route.path.toLowerCase();
  return (
    router.currentRoute.value !== START_LOCATION &&
    (path === indexPath || path === `${indexPath}/`)
  );
});

// R2 — wire `checkError` → auto-logout into the data-error path. Mounted here
// (inside `<Admin>`'s provided context + vue-query client) so the watcher's
// injects resolve; runs regardless of `requireAuth` since a data 401/403 can
// surface on any page. No-op without an authProvider.
useWatchDataErrors();

// The app root's writing direction follows the active locale, the Vue twin of
// React's `LocaleDirectionProvider`: `dir` on `<html>`, so a right-to-left
// locale such as Arabic renders right to left. The `dir` the host had comes back
// when the shell unmounts.
const locale = useLocale();
const direction = computed(() => getLocaleDirection(locale.value));

watchEffect((onCleanup) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const previous = root.getAttribute("dir");
  root.setAttribute("dir", direction.value);
  onCleanup(() => {
    if (previous === null) root.removeAttribute("dir");
    else root.setAttribute("dir", previous);
  });
});
</script>

<template>
  <!-- The empty state comes first, ahead of the auth gate, as in React. -->
  <ThemeProvider v-if="showReady()">
    <slot name="ready" />
  </ThemeProvider>
  <!-- A noLayout match renders in every auth state, as React mounts no-layout
       routes outside the gate. -->
  <ShellErrorBoundary v-else-if="isNoLayout">
    <ThemeProvider>
      <router-view />
    </ThemeProvider>
    <template v-if="slots.error" #error="errorProps">
      <slot name="error" v-bind="errorProps" />
    </template>
  </ShellErrorBoundary>
  <ThemeProvider v-else-if="requireAuth && gate.isPending.value">
    <slot name="loading">
      <div class="flex min-h-screen flex-col justify-center items-center">
        <Spinner class="size-9" />
      </div>
    </slot>
  </ThemeProvider>
  <slot
    v-else-if="requireAuth && !gate.authenticated.value"
    name="login"
  >
    <ThemeProvider>
      <LoginPage />
    </ThemeProvider>
  </slot>
  <template v-else>
    <!-- Beside the #layout slot, not inside it, so a custom layout still
         redirects. A dashboard owns the index instead. -->
    <NavigateToFirstResource v-if="routes && isIndex && !slots.dashboard" />
    <ShellErrorBoundary>
      <slot name="layout">
        <ThemeProvider>
          <Layout>
            <slot v-if="isIndex" name="dashboard" />
            <router-view />
          </Layout>
        </ThemeProvider>
      </slot>
      <template v-if="slots.error" #error="errorProps">
        <slot name="error" v-bind="errorProps" />
      </template>
    </ShellErrorBoundary>
  </template>
</template>
