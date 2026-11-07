<script setup lang="ts">
/**
 * `<OrderShow>` — the order detail page, the Vue twin of `apps/demo`'s
 * `OrderShow`.
 */

import {
  BadgeField,
  ChipField,
  DateField,
  DurationField,
  NumberField,
  RecordField,
  ReferenceArrayField,
  ReferenceField,
  ReferenceOneField,
  Show,
  SingleFieldList,
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
    <RecordField label="Products">
      <ReferenceArrayField source="product_ids" reference="products">
        <SingleFieldList>
          <ChipField source="name" />
        </SingleFieldList>
      </ReferenceArrayField>
    </RecordField>
    <RecordField label="Quantity">
      <NumberField source="quantity" />
    </RecordField>
    <RecordField label="Delivery">
      <DateField source="delivery_at" show-time />
    </RecordField>
    <RecordField label="Handling time">
      <DurationField source="handling" display-format="relative" />
    </RecordField>
    <RecordField label="Customer's latest order">
      <ReferenceOneField
        reference="orders"
        target="customer_id"
        source="customer_id"
        :sort="{ field: 'delivery_at', order: 'DESC' }"
      >
        <TextField source="reference" />
      </ReferenceOneField>
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
