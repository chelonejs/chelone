<script setup lang="ts">
/**
 * `<CustomerList>` — the customers list page, the Vue twin of `apps/demo`'s
 * `CustomerList`. Selected rows change segment, leave as a file or go; a CSV
 * brings new customers in; an at-risk panel sits beside the table.
 */

import {
  BulkActionsToolbar,
  BulkDeleteButton,
  BulkEditDrawer,
  BulkExportButton,
  BulkUpdateButton,
  ColumnsButton,
  DataTable,
  DataTableCol,
  EmailField,
  ExportButton,
  List,
  RefreshIconButton,
  SelectAllButton,
  SelectInput,
  useRefresh,
} from "@chelone/vue";
import { CsvImport } from "@chelone/vue/csv-import";
import { z } from "zod";
import AtRiskCustomers from "./AtRiskCustomers.vue";

const segmentChoices = ["new", "active", "at-risk", "champion"].map((id) => ({
  id,
  name: id,
}));

/** The columns an imported CSV must carry; the rest of a customer is optional. */
const customerImportSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
  plan: z.string().optional(),
  segment: z.string().optional(),
});

// The import creates customers behind the list's back, so refresh it when done.
const refresh = useRefresh();
</script>

<template>
  <List resource="customers" :per-page="5">
    <template #actions>
      <ColumnsButton />
      <CsvImport :schema="customerImportSchema" :on-complete="() => refresh()" />
      <ExportButton />
      <RefreshIconButton label="Refresh customers" />
    </template>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div class="min-w-0 flex-1">
        <DataTable>
          <DataTableCol source="name" />
          <DataTableCol source="email">
            <EmailField source="email" />
          </DataTableCol>
          <DataTableCol source="city" />
          <DataTableCol source="plan" />
          <DataTableCol source="segment" />
          <template #bulkActions>
            <SelectAllButton />
            <BulkEditDrawer label="Edit customers" title="Edit selected customers">
              <SelectInput source="segment" :choices="segmentChoices" />
            </BulkEditDrawer>
            <BulkUpdateButton label="Mark champion" :data="{ segment: 'champion' }" />
            <BulkExportButton />
            <BulkDeleteButton />
          </template>
        </DataTable>
      </div>
      <AtRiskCustomers />
    </div>
  </List>
</template>
