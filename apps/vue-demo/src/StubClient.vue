<script setup lang="ts">
/**
 * Swaps the app's auth provider for the stub from `@chelone/demo-data`, for
 * what sits inside it: the Supabase auth pages then run with no network call.
 * It keeps every other service of the app's context but the query client: the
 * auth state is cached under one key, so sharing the app's client would show the
 * demo's signed-in user to the login page, which then redirects at once, and
 * the stub's signed-out state to the demo's user menu.
 */

import { stubSupabaseAuthProvider } from "@chelone/demo-data";
import { provideCheloneContext, useCheloneContext } from "@chelone/vue";
import { QueryClient, VUE_QUERY_CLIENT } from "@tanstack/vue-query";
import { provide } from "vue";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

provideCheloneContext({
  ...useCheloneContext(),
  authProvider: stubSupabaseAuthProvider(),
  queryClient,
});
// The auth composables read the client `<Admin>` provides under this key, not the context's.
provide(VUE_QUERY_CLIENT, queryClient);
</script>

<template>
  <slot />
</template>
