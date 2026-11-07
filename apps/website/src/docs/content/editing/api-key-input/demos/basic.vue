<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { ApiKeyField, ApiKeyInput, provideRecordContext } from "@chelone/vue";
import { computed, ref } from "vue";

const rotations = ref(0);
// The record is a ref so the key shown beside the button follows a rotation.
provideRecordContext(
  computed(() => ({ id: 1, apiKey: `ck_live_4f9a21c${rotations.value}` })),
);

function rotate() {
  rotations.value += 1;
}
</script>

<template>
  <!-- `<ApiKeyInput>` asks for confirmation, then runs `onRotate`; here that swaps the key shown beside it. -->
  <div class="flex flex-wrap items-center gap-4">
    <ApiKeyField source="apiKey" />
    <ApiKeyInput source="apiKey" :on-rotate="rotate" />
  </div>
</template>
