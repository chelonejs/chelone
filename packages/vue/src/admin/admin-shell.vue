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
 * fallback); a caller-provided `#layout` slot stays bare, preserving the prior
 * `<Admin>` behavior where an override owned its own theming.
 */

import Layout from "../components/admin/layout/layout.vue";
import ThemeProvider from "../components/admin/layout/theme-provider.vue";
import LoginPage from "../components/admin/auth/login-page.vue";
import Spinner from "../components/ui/spinner.vue";
import { useAuthGate } from "./auth-gate";

const props = defineProps<{ requireAuth: boolean }>();

defineSlots<{
  /** Override the default shell chrome (wins over the route view). */
  layout?: () => unknown;
  /** The index/dashboard content (rendered before the route view by default). */
  dashboard?: () => unknown;
  /** The unauthenticated login screen (default `<LoginPage>`). */
  login?: () => unknown;
}>();

const gate = useAuthGate(props.requireAuth);
</script>

<template>
  <ThemeProvider v-if="requireAuth && gate.isPending.value">
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
  <slot v-else name="layout">
    <ThemeProvider>
      <Layout>
        <slot name="dashboard" />
        <router-view />
      </Layout>
    </ThemeProvider>
  </slot>
</template>
