<script setup lang="ts">
import { Title, TitlePortal } from "@chelone/vue";
</script>

<template>
  <!-- `<Title>` shows "Posts" in the `<TitlePortal>` slot it teleports to. -->
  <header class="flex h-12 items-center rounded-md border px-4">
    <TitlePortal />
    <Title title="Posts" />
  </header>
</template>
