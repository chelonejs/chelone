<script setup lang="ts">
/**
 * Swaps the app's auth provider for the stub from `@chelone/demo-data`, for
 * what sits inside it: the Supabase auth pages then run with no network call.
 * It keeps every other service of the app's context.
 */

import { stubSupabaseAuthProvider } from "@chelone/demo-data";
import { provideCheloneContext, useCheloneContext } from "@chelone/vue";

provideCheloneContext({
  ...useCheloneContext(),
  authProvider: stubSupabaseAuthProvider(),
});
</script>

<template>
  <slot />
</template>
