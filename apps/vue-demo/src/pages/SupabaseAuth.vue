<script lang="ts">
export const title = "Supabase auth";
export const group = "Account";
</script>

<script setup lang="ts">
/**
 * The Supabase auth pages: login with email and OAuth buttons, forgot password
 * and set password. They are routes of their own under `/auth/`, outside the
 * layout (see `auth-routes.ts`), and run against a stub client, so this page
 * only links to them.
 */

import { RouterLink } from "vue-router";
import { recoveryLink } from "../auth-routes";

const pages = [
  {
    to: "/auth/login",
    name: "Login",
    text: "Email and password, a forgot password link and the GitHub and Google buttons.",
  },
  {
    to: "/auth/forgot-password",
    name: "Forgot password",
    text: "Asks for an email and sends the reset link.",
  },
  {
    to: recoveryLink,
    name: "Set password",
    text: "Where a recovery link ends. The link carries the tokens the form reads.",
  },
];
</script>

<template>
  <section aria-label="Supabase auth pages" class="max-w-2xl">
    <h1 class="text-2xl font-semibold tracking-tight">Supabase auth</h1>
    <p class="mt-2 text-sm text-muted-foreground">
      These pages run against a stub client: any email and password sign in, no
      email is sent and the OAuth buttons report that they are off.
    </p>
    <ul class="mt-6 divide-y rounded-md border">
      <li v-for="page in pages" :key="page.to">
        <RouterLink
          :to="page.to"
          class="flex flex-col gap-1 px-4 py-3 hover:bg-accent"
        >
          <span class="font-medium">{{ page.name }}</span>
          <span class="text-sm text-muted-foreground">{{ page.text }}</span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
