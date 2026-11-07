<script lang="ts">
/**
 * `<DropdownMenu>` has no `defaultOpen` prop: it opens on a click of its
 * trigger. This child reads the menu off the context the root provides and
 * opens it on mount, which is the Vue form of the React twin's `defaultOpen`.
 */

import { useDropdownMenu } from "@chelone/vue";
import { defineComponent, onMounted } from "vue";

const OpenOnMount = defineComponent({
  name: "OpenOnMount",
  setup() {
    const { setOpen } = useDropdownMenu();
    onMounted(() => setOpen(true));
    return () => null;
  },
});
</script>

<script setup lang="ts">
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Logout,
} from "@chelone/vue";
</script>

<template>
  <!-- `<Logout>` is the "Log out" row inside the user menu's dropdown, shown open here. The menu is absolutely positioned, so the wrapper reserves the room it draws into. -->
  <div class="flex min-h-24 items-start justify-center">
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button size="sm" variant="outline">
          User menu
        </Button>
      </DropdownMenuTrigger>
      <OpenOnMount />
      <DropdownMenuContent align="start">
        <Logout redirect-to="/login" />
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
