<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { Labeled, NumberField, TextField, WrapperField } from "@chelone/vue";
</script>

<template>
  <!-- A post's title and view count grouped under one Publication label. -->
  <Labeled>
    <WrapperField label="Publication">
      <!-- `<WrapperField>` renders no element, and `<Labeled>` stacks its
           children, so the span keeps the fields on one line. -->
      <span>
        <TextField source="title" />
        ·
        <NumberField source="views" /> views
      </span>
    </WrapperField>
  </Labeled>
</template>
