<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { EditButton } from "@chelone/vue";
</script>

<template>
  <!-- `<EditButton>` links the current post to its edit page. The frame is a
       desktop viewport, so the button is centred in it as the React panel centres it. -->
  <div class="flex w-full justify-center">
    <EditButton />
  </div>
</template>
