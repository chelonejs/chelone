<script setup lang="ts">
import { ShowGuesser } from "@chelone/vue";
</script>

<template>
  <!-- A `<ShowGuesser>`: one labelled row per field of the `posts` schema. The Show view fetches record id=1 explicitly (no route param in the preview). -->
  <ShowGuesser :id="1" :enable-log="false" />
</template>
