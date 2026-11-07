<script setup lang="ts">
import type { AuthProvider } from "@chelone/core";
import {
  CheloneContextKey,
  provideCheloneContext,
  UserMenu,
} from "@chelone/vue";
import { inject } from "vue";

const signedIn: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({ id: 1, fullName: "Ada Lovelace" }),
};

// `<UserMenu>` renders nothing with no auth provider, and the preview has no
// login session, so the demo re-provides `<Admin>`'s context with a signed-in one.
const context = inject(CheloneContextKey);
if (context) provideCheloneContext({ ...context, authProvider: signedIn });
</script>

<template>
  <!-- `<UserMenu>` is the avatar button of a signed-in "Ada Lovelace", opening a menu with Log out. -->
  <UserMenu />
</template>
