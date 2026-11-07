<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { RatingInput } from "@chelone/vue";
</script>

<template>
  <!-- `<RatingInput>` rates a post 4.5 out of 5 stars, half stars clickable. -->
  <div class="w-full max-w-xs">
    <RatingInput
      source="rating"
      :max="5"
      allow-half
      :default-value="4.5"
    />
  </div>
</template>
