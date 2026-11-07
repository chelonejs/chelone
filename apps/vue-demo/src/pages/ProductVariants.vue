<script lang="ts">
export const title = "Product variants";
export const group = "Catalog";
</script>

<script setup lang="ts">
/**
 * One product, edited in three tabs: its variants as rows of size, SKU and
 * stock, the tags it carries, and a read-only stock table of what is saved.
 * `<ArrayInput>` holds its own rows in Vue, where React takes a
 * `<SimpleFormIterator>` inside it.
 */

import {
  ArrayField,
  ArrayInput,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  DatagridInput,
  Edit,
  NumberInput,
  ReferenceArrayInput,
  TabbedForm,
  TabbedFormTab,
  TextInput,
  Toolbar,
} from "@chelone/vue";

/** `<TabbedForm>` is headless, so the page styles its tab headers. */
const tabStyles =
  "[&_[role=tablist]]:mb-4 [&_[role=tablist]]:flex [&_[role=tablist]]:gap-1 [&_[role=tablist]]:border-b [&_[role=tab]]:-mb-px [&_[role=tab]]:border-b-2 [&_[role=tab]]:border-transparent [&_[role=tab]]:px-3 [&_[role=tab]]:py-2 [&_[role=tab]]:text-sm [&_[role=tab]]:font-medium [&_[role=tab]]:text-muted-foreground [&_[role=tab][aria-selected=true]]:border-foreground [&_[role=tab][aria-selected=true]]:text-foreground";
</script>

<template>
  <Edit resource="products" :id="1" title="Product variants">
    <div :class="tabStyles">
<TabbedForm :sync-with-location="false">
      <TabbedFormTab name="variants" label="Variants">
        <ArrayInput source="variants" :label="false" inline :get-item-label="true">
          <TextInput source="option" label="Size" />
          <TextInput source="sku" label="SKU" />
          <NumberInput source="stock" label="Stock" :min="0" />
        </ArrayInput>
      </TabbedFormTab>
      <TabbedFormTab name="tags" label="Tags">
        <ReferenceArrayInput source="tags" reference="tags">
          <DatagridInput option-label="Tag" />
        </ReferenceArrayInput>
      </TabbedFormTab>
      <TabbedFormTab name="stock" label="Stock">
        <ArrayField source="variants">
          <DataTable :pagination="false">
            <DataTableCol source="option" label="Size" />
            <DataTableCol source="sku" label="SKU" />
            <DataTableNumberCol source="stock" label="Stock" />
          </DataTable>
        </ArrayField>
      </TabbedFormTab>
      <Toolbar />
    </TabbedForm>
</div>
  </Edit>
</template>
