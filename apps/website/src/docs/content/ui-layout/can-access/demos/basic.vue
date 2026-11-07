<script setup lang="ts">
/**
 * `<CanAccess>` reads the answer to `authProvider.canAccess` through the query
 * client, which caches it by params. In Vue `<Admin>` is what mounts the
 * provider, so the demo mounts one `<Admin>` per role, each with that role's
 * provider and its own query client: `:key="role"` remounts it, so switching
 * roles cannot read a cached answer. The denied case is the `#accessDenied`
 * slot, where React takes an `accessDenied` node.
 */

import {
  type AuthProvider,
  canAccessWithPermissions,
  type Permission,
} from "@chelone/core";
import { Admin, Button, CanAccess, useDataProvider } from "@chelone/vue";
import { ref } from "vue";

const grants: Record<string, Permission[]> = {
  editor: [{ resource: "posts", action: ["list", "show", "edit"] }],
  viewer: [{ resource: "posts", action: ["list", "show"] }],
};

function authProviderFor(role: string): AuthProvider {
  return {
    checkAuth: async () => {},
    checkError: async () => {},
    login: async () => {},
    logout: async () => {},
    canAccess: async (params) =>
      canAccessWithPermissions(grants[role] ?? [], params),
  };
}

const dataProvider = useDataProvider();
const role = ref("editor");
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <div class="flex items-center gap-2">
      <Button
        v-for="name in Object.keys(grants)"
        :key="name"
        type="button"
        size="sm"
        :variant="name === role ? 'default' : 'outline'"
        :aria-pressed="name === role"
        @click="role = name"
      >
        {{ name }}
      </Button>
    </div>
    <Admin
      :key="role"
      :data-provider="dataProvider"
      :auth-provider="authProviderFor(role)"
    >
      <template #layout>
        <CanAccess action="edit" resource="posts">
          <section
            aria-label="Post tools"
            class="rounded-md border p-4 text-sm"
          >
            The {{ role }} role can edit posts, so the tools show.
          </section>
          <template #accessDenied>
            <p class="text-sm text-muted-foreground">
              The {{ role }} role cannot edit posts.
            </p>
          </template>
        </CanAccess>
      </template>
    </Admin>
  </div>
</template>
