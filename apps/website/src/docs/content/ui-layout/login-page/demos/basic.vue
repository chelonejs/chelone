<script setup lang="ts">
import { type AuthProvider } from "@chelone/core";
import {
  LoginPage,
  provideCheloneContext,
  useCheloneContext,
} from "@chelone/vue";

/**
 * `<LoginPage>` reads `useAuthState()` and redirects to `/` once it resolves
 * `authenticated: true`, which the preview's signed-in provider would do. This
 * re-provides `<Admin>`'s context with one whose `checkAuth` rejects, so the
 * visitor reads as signed out and the page keeps its form.
 */
const signedOut: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {
    throw new Error("signed out");
  },
  checkError: async () => {},
};

const context = useCheloneContext();
provideCheloneContext({ ...context, authProvider: signedOut });
</script>

<template>
  <!-- `<LoginPage>` shows a "Sign in" heading over an email field, a password field and a submit button. -->
  <LoginPage />
</template>
