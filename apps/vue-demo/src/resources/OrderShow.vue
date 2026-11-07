<script setup lang="ts">
/**
 * `<OrderShow>` — the order detail page, the Vue twin of `apps/demo`'s
 * `OrderShow`.
 */

import {
  BadgeField,
  NumberField,
  RecordField,
  ReferenceField,
  Show,
  TextField,
} from "@chelone/vue";
</script>

<template>
  <Show resource="orders">
    <RecordField source="reference" />
    <RecordField label="Customer">
      <ReferenceField source="customer_id" reference="customers">
        <TextField source="name" />
      </ReferenceField>
    </RecordField>
    <RecordField label="Product">
      <ReferenceField source="product_id" reference="products">
        <TextField source="name" />
      </ReferenceField>
    </RecordField>
    <RecordField label="Quantity">
      <NumberField source="quantity" />
    </RecordField>
    <RecordField label="Status">
      <BadgeField source="status" />
    </RecordField>
    <RecordField label="Total">
      <NumberField
        source="total"
        :options="{ style: 'currency', currency: 'USD' }"
      />
    </RecordField>
  </Show>
</template>
