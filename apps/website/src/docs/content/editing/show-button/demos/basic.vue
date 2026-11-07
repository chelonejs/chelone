<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { ShowButton } from "@chelone/vue";
</script>

<template>
  <!-- `<ShowButton>` renders a "Show" link to the first seeded post's show page. The link stays inert so the reader keeps the docs page: `RouterLink` navigates before a handler on the link itself runs, so the click is stopped in the capture phase of a wrapper. -->
  <span class="contents" @click.capture.prevent>
    <ShowButton />
  </span>
</template>
