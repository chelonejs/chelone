<script setup lang="ts">
/**
 * `<CustomerShow>` — the customer detail page, the Vue twin of `apps/demo`'s
 * `CustomerShow`: the customer's fields, plan and usage, then their orders through a
 * `<ReferenceManyField>` that pages on the server (the table's own pager is
 * off; the `<ListPagination>` below it is the one).
 */

import {
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  DateField,
  EmailField,
  ListPagination,
  PhoneField,
  RecordField,
  ReferenceManyCount,
  ReferenceManyField,
  Show,
  SubscriptionPlanField,
  UpdateButton,
  UsageMeterField,
} from "@chelone/vue";
import { plans } from "./customer-plans";
import CustomersOnPlan from "./CustomersOnPlan.vue";
</script>

<template>
  <Show resource="customers">
    <template #actions>
      <UpdateButton :data="{ segment: 'champion' }" label="Mark champion" />
    </template>
    <RecordField source="name" />
    <RecordField label="Email">
      <EmailField source="email" />
    </RecordField>
    <RecordField label="Phone">
      <PhoneField source="phone" />
    </RecordField>
    <RecordField source="city" />
    <RecordField label="Customer since">
      <DateField source="joined_on" />
    </RecordField>
    <RecordField label="Plan">
      <SubscriptionPlanField source="plan" :plans="plans" />
    </RecordField>
    <RecordField label="Customers on this plan">
      <CustomersOnPlan />
    </RecordField>
    <RecordField label="Usage">
      <UsageMeterField
        source="usage"
        limit-source="usage_limit"
        unit="%"
        class="w-64"
      />
    </RecordField>
    <RecordField label="Order count">
      <ReferenceManyCount reference="orders" target="customer_id" />
    </RecordField>
    <RecordField label="Orders">
      <ReferenceManyField reference="orders" target="customer_id">
        <DataTable :pagination="false">
          <DataTableCol source="reference" />
          <DataTableCol source="status" />
          <DataTableNumberCol source="total" />
        </DataTable>
        <ListPagination />
      </ReferenceManyField>
    </RecordField>
  </Show>
</template>
