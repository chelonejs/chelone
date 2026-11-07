<script lang="ts">
export const mode = "record";
</script>

<script setup lang="ts">
import { CurrencyField } from "@chelone/vue";

const product = { id: 1, price: 1234.5 };
</script>

<template>
  <!-- `<CurrencyField>` formats a price in US dollars. -->
  <CurrencyField source="price" currency="USD" :record="product" />
</template>
