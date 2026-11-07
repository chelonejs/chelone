<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { UpdateButton } from "@chelone/vue";
</script>

<template>
  <!-- `<UpdateButton>` renders a "Publish" button that patches the first seeded post to published and shows an Undo notification. -->
  <UpdateButton label="Publish" :data="{ published: true }" />
</template>
