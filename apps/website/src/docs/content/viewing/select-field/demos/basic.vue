<script setup lang="ts">
import { SelectField } from "@chelone/vue";

const post = { id: 1, status: "published" };
const choices = [
  { id: "draft", name: "Draft" },
  { id: "published", name: "Published" },
  { id: "archived", name: "Archived" },
];
</script>

<template>
  <!-- `<SelectField>` maps a record's stored `status` to the label of the matching choice. -->
  <SelectField source="status" :choices="choices" :record="post" />
</template>
