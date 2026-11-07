<script setup lang="ts">
import { ShapeInput } from "@chelone/vue/maps/draw";
import PreviewPlaceForm from "@/PreviewPlaceForm.vue";
</script>

<template>
  <!-- `<ShapeInput>` with `kind="Polygon"` edits the place's delivery zone by drawing on the map. -->
  <PreviewPlaceForm>
    <ShapeInput source="zone" kind="Polygon" label="Delivery zone" />
  </PreviewPlaceForm>
</template>
