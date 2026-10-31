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

import { joinBasename } from "@chelone/core";
import { computed, useSlots } from "vue";
import { START_LOCATION, useRoute, useRouter } from "vue-router";
import Layout from "../components/admin/layout/layout.vue";
import ThemeProvider from "../components/admin/layout/theme-provider.vue";
import LoginPage from "../components/admin/auth/login-page.vue";
import Spinner from "../components/ui/spinner.vue";
import { useBasename } from "../router/adapter";
import { useWatchDataErrors } from "../auth/permissions-hooks";
import { useAuthGate } from "./auth-gate";
import { NO_LAYOUT_META } from "./custom-routes";
import type { ErrorFallbackProps } from "./default-error-fallback.vue";
import NavigateToFirstResource from "./navigate-to-first-resource.vue";
import ShellErrorBoundary from "./shell-error-boundary.vue";

const props = defineProps<{ requireAuth: boolean }>();

defineSlots<{
  /** Override the default shell chrome (wins over the route view). */
  layout?: () => unknown;
  /** The index/dashboard content (rendered before the route view at the index path only). */
  dashboard?: () => unknown;
  /** The unauthenticated login screen (default `<LoginPage>`). */
  login?: () => unknown;
  /** Replaces the default fallback shown when the layout branch throws. */
  error?: (props: ErrorFallbackProps) => unknown;
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
</script>

<template>
  <!-- A noLayout match comes first: it renders in every auth state, as React
       mounts no-layout routes outside the gate. -->
  <ThemeProvider v-if="isNoLayout">
    <router-view />
  </ThemeProvider>
  <ThemeProvider v-else-if="requireAuth && gate.isPending.value">
    <div class="flex min-h-screen flex-col justify-center items-center">
      <Spinner class="size-9" />
    </div>
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
    <NavigateToFirstResource v-if="isIndex && !slots.dashboard" />
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
