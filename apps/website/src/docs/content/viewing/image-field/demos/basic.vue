<script setup lang="ts">
import { ImageField } from "@chelone/vue";

const post = { id: 1, image: "/chelone-mark.svg", title: "Chelone logo" };
</script>

<template>
  <!-- The Chelone logo rendered from the record's image URL. -->
  <ImageField source="image" title="title" :record="post" class="[&_img]:size-24" />
</template>
