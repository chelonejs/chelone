<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { PrevNextButtons } from "@chelone/vue";
</script>

<template>
  <!-- `<PrevNextButtons>` shows a post's position and links to its neighbours. -->
  <PrevNextButtons link-type="show" />
</template>
