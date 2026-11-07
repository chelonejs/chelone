<script lang="ts">
/**
 * `<CommandMenu>` opens from this button or from `Ctrl+K` and lists the resources
 * to jump to. `useCommandMenu` reads the menu off the context, so the button is a
 * child of `<CommandMenu>`, the way an app bar's button is.
 */

import { Button, useCommandMenu } from "@chelone/vue";
import { defineComponent, h } from "vue";

const SearchButton = defineComponent({
  setup() {
    const { open } = useCommandMenu();
    return () =>
      h(Button, { variant: "outline", onClick: open }, {
        default: () => [
          "Search ",
          h("span", { class: "text-xs text-muted-foreground" }, "Ctrl+K"),
        ],
      });
  },
});
</script>

<script setup lang="ts">
import { CommandMenu } from "@chelone/vue";
</script>

<template>
  <!-- The preview is narrow, so the palette opens as the bottom sheet, which
       needs more room than the frame's default height. -->
  <CommandMenu>
    <div class="flex min-h-96 w-full items-center justify-center">
      <SearchButton />
    </div>
  </CommandMenu>
</template>
