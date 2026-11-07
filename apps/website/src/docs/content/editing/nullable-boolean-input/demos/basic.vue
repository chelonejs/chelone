<script setup lang="ts">
import { Create, NullableBooleanInput } from "@chelone/vue";
</script>

<template>
  <!--
    The select names its option only when the value is already there at the first
    render, so the demo seeds a create form instead of passing a default.
    `<NullableBooleanInput>` picks between Yes, No and unknown for `published`;
    the seeded record says Yes.
  -->
  <Create resource="posts" :record="{ published: true }">
    <div class="w-full max-w-xs">
      <NullableBooleanInput source="published" />
    </div>
  </Create>
</template>
