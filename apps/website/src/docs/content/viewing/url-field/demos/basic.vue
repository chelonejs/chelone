<script setup lang="ts">
import { UrlField } from "@chelone/vue";

const post = { id: 1, website: "https://chelone.dev" };
</script>

<template>
  <!-- A website URL displayed as a clickable link. -->
  <UrlField source="website" :record="post" />
</template>
