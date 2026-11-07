<script setup lang="ts">
/**
 * The customer and the products of an order form, shared by `<OrderEdit>` and
 * `<OrderCreate>`. The Vue `<ReferenceInput>` renders a native select with no
 * autocomplete child, so the customer's `<AutocompleteInput>` takes the fetched
 * customers as its `choices`. The input reads `choices` once when it mounts, so
 * it waits for the customers to load.
 */

import {
  AutocompleteArrayInput,
  AutocompleteInput,
  ReferenceArrayInput,
  ReferenceInput,
  useGetList,
} from "@chelone/vue";
import { computed } from "vue";

const customers = useGetList("customers", { pagination: { page: 1, perPage: 50 } });
const customerChoices = computed(() => customers.data.value?.data);
</script>

<template>
  <AutocompleteInput
    v-if="customerChoices"
    source="customer_id"
    label="Customer"
    option-text="name"
    :choices="customerChoices"
  />
  <ReferenceInput source="product_id" reference="products" label="Main product" />
  <ReferenceArrayInput source="product_ids" reference="products">
    <AutocompleteArrayInput label="Products" option-text="name" />
  </ReferenceArrayInput>
</template>
