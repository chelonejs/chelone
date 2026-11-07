<script setup lang="ts">
import { EditGuesser } from "@chelone/vue";
</script>

<template>
  <!-- An `<EditGuesser>`: one input per field of the `posts` schema, validated against it on save. The Edit view fetches record id=1 explicitly (no route param in the preview). -->
  <EditGuesser :id="1" :enable-log="false" />
</template>
