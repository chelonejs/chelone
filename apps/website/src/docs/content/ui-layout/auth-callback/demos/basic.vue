<script setup lang="ts">
import { type AuthProvider } from "@chelone/core";
import {
  AuthCallback,
  provideCheloneContext,
  useCheloneContext,
} from "@chelone/vue";

/**
 * `<AuthCallback>` runs the provider's `handleCallback` and shows its spinner
 * until it settles. The preview has no OAuth exchange to finish, so the demo
 * re-provides `<Admin>`'s context with a provider whose callback never settles:
 * the page keeps its loading state instead of erroring, and never redirects
 * away from the frame.
 */
const pendingCallback: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  handleCallback: () => new Promise<void>(() => {}),
};

const context = useCheloneContext();
provideCheloneContext({ ...context, authProvider: pendingCallback });
</script>

<template>
  <!-- `<AuthCallback>` shows its loading spinner with callback execution paused. The spinner turns, so the box it sweeps is wider than the spinner itself; the demo reserves the height the page fits itself to, or the frame clips the turn. -->
  <div class="flex min-h-24 items-center justify-center">
    <AuthCallback />
  </div>
</template>
