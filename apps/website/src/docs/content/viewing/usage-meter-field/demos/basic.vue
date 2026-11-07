<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { UsageMeterField } from "@chelone/vue";

const record = { id: 1, used: 45, limit: 100 };
</script>

<template>
  <!-- Storage usage displayed as a progress meter against a quota. -->
  <UsageMeterField
    source="used"
    limit-source="limit"
    unit="GB"
    class="w-64"
    :record="record"
  />
</template>
