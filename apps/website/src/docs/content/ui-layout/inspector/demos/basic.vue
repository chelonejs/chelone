<script setup lang="ts">
/**
 * `<Inspector>` opens its panel while configure mode is on. Press the button,
 * then Customize on the outlined box. The piece's editor is the `#editor` slot,
 * where React takes an `editor` node.
 */

import {
  Configurable,
  Inspector,
  InspectorButton,
} from "@chelone/vue/inspector";
</script>

<template>
  <Inspector>
    <div class="flex w-full max-w-sm flex-col gap-4">
      <InspectorButton />
      <Configurable
        preference-key="docs-demo"
        title="Greeting"
        class="rounded-md p-4"
      >
        <p class="font-medium">Welcome back to the posts admin.</p>
        <template #editor>
          <p class="text-sm">
            The editor of a piece goes here, in the panel.
          </p>
        </template>
      </Configurable>
    </div>
  </Inspector>
</template>
