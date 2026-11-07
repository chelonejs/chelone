<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { RatingField } from "@chelone/vue";

const post = { id: 1, rating: 4.5, reviewCount: 24 };
</script>

<template>
  <!-- `<RatingField>` shows a four-and-a-half-star rating with a review count. -->
  <RatingField
    source="rating"
    allow-half
    count-source="reviewCount"
    :record="post"
  />
</template>
