<script setup lang="ts">
import { FileField } from "@chelone/vue";

const post = { id: 1, attachment: "/chelone-mark.svg", name: "Chelone logo" };
</script>

<template>
  <!-- A downloadable file link labeled with the attachment's name. -->
  <FileField
    source="attachment"
    title="name"
    download="chelone-mark.svg"
    :record="post"
  />
</template>
