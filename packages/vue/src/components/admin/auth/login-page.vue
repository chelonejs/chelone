<script lang="ts">
/** Props for {@link LoginPage}. */
export interface LoginPageProps {
  /** Path a successful sign-in redirects to. Forwarded to `<LoginForm>`. */
  redirectTo?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<LoginPage>` — the default `#login` slot, shown to unauthenticated users on a
 * gated `<Admin requireAuth>`. The Vue twin of `@chelone/react`'s
 * `auth/login-page.tsx`; composes `<AuthLayout>` + `<LoginForm>`.
 *
 * Chelone divergence (shared with the React twin): there is no imperative
 * `useCheckAuth`. The page reads `useAuthState()` (the auth-state query, which
 * resolves `{ authenticated }` and never rejects) and redirects to `/` once it
 * resolves `authenticated: true` — via a `watch` on that flag rather than
 * React's `useEffect`.
 */

import { watch } from "vue";
import { useAuthState } from "../../../auth/auth-hooks";
import { useRedirect } from "../../../router";
import AuthLayout from "./auth-layout.vue";
import LoginForm from "./login-form.vue";

const props = defineProps<LoginPageProps>();

defineSlots<{
  /** Custom content in place of the default `<LoginForm>`. */
  default?: () => unknown;
}>();

const { data } = useAuthState();
const redirect = useRedirect();

// Redirect already-authenticated users away from the login page.
watch(
  () => data.value?.authenticated,
  (authenticated) => {
    if (authenticated) redirect("/");
  },
  { immediate: true },
);
</script>

<template>
  <AuthLayout title="Sign in" :class="props.class">
    <slot>
      <LoginForm :redirect-to="props.redirectTo" />
    </slot>
  </AuthLayout>
</template>
