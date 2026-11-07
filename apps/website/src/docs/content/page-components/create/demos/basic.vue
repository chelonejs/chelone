<script setup lang="ts">
import {
  BooleanInput,
  Create,
  NumberInput,
  ReferenceInput,
  SaveButton,
  TextInput,
} from "@chelone/vue";
</script>

<template>
  <!-- A `<Create>` form for a new post. Inputs compose directly as children, with no form wrapper, and validate against the resource's Zod schema. -->
  <Create>
    <TextInput source="title" />
    <TextInput source="body" />
    <ReferenceInput source="author_id" reference="authors" />
    <NumberInput source="views" :min="0" :default-value="0" />
    <BooleanInput source="published" :default-value="false" />
    <SaveButton />
  </Create>
</template>
