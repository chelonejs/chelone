<script setup lang="ts">
import { SimplifyInput } from "@chelone/vue/maps/draw";
import PreviewPlaceForm from "@/PreviewPlaceForm.vue";
</script>

<template>
  <!-- `<SimplifyInput>` thins the delivery zone as the slider moves, and previews the result. -->
  <PreviewPlaceForm>
    <!-- The zone spans about a hundredth of a degree, so the slider is scaled
         to it and starts at 0: the form holds the zone as it was until moved. -->
    <SimplifyInput
      source="zone"
      label="Delivery zone"
      :tolerance="0"
      :max-tolerance="0.002"
      :step="0.0001"
    />
  </PreviewPlaceForm>
</template>
