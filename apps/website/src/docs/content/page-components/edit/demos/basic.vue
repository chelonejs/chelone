<script setup lang="ts">
/**
 * `<Edit>` — the Vue twin of `basic.tsx`: the edit view for post 1. It fetches
 * and hydrates the record, the child inputs bind to it, and `<Toolbar>` renders
 * Save. `<ReferenceInput>` is the Vue form: a select over the `authors` records,
 * with no child input to wire.
 */
import {
  BooleanInput,
  Edit,
  NumberInput,
  ReferenceInput,
  TextInput,
  Toolbar,
} from "@chelone/vue";
</script>

<template>
  <Edit :id="1">
    <TextInput source="title" />
    <TextInput source="body" />
    <ReferenceInput source="author_id" reference="authors" />
    <NumberInput source="views" :min="0" />
    <BooleanInput source="published" />
    <Toolbar />
  </Edit>
</template>
