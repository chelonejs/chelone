<script lang="ts">
/**
 * `<Assistant>` is fixed to the viewport. The transform makes this box its
 * containing block, so the button and the panel stay inside the preview. The
 * transport is made once, outside the component: a new one starts a new
 * conversation.
 */

import { echoAssistantTransport } from "@chelone/core";

const transport = echoAssistantTransport();
</script>

<script setup lang="ts">
import { Assistant } from "@chelone/vue";
</script>

<template>
  <div
    class="relative h-80 w-full max-w-xl transform-gpu overflow-hidden rounded-md border"
  >
    <p class="p-4 text-sm text-muted-foreground">
      Ask anything. This transport echoes your question back, with no model behind
      it.
    </p>
    <Assistant
      :transport="transport"
      welcome-message="Hi! Type a question and I will echo it."
    />
  </div>
</template>
