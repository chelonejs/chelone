<script lang="ts">
export const mode = "input";
</script>

<script setup lang="ts">
import { CurrencyInput } from "@chelone/vue";
</script>

<template>
  <!-- `<CurrencyInput>` shows a US dollar amount with the currency symbol beside it. -->
  <CurrencyInput source="total" currency="USD" :default-value="42.5" />
</template>
