<script setup lang="ts">
/**
 * `<ProductList>` — the products list page, the Vue twin of `apps/demo`'s
 * `ProductList`. The header holds `<SortButton>` and `<CreateButton>` in a
 * `<TopToolbar>`. Beside the table sits a sidebar: live search, one-click
 * filter lists, toggle buttons and the saved queries. Above the table a
 * `<ListToolbar>` holds a SKU lookup that is always on and a shipping class
 * the Add filter menu can bring in. The `q` search is `withTextSearch`'s, in
 * `realtime.ts`.
 */

import { categoryChoices, shippingClassChoices } from "@chelone/demo-data";
import {
  CreateButton,
  DataTable,
  DataTableCol,
  DataTableNumberCol,
  FilterList,
  FilterListItem,
  FilterListSection,
  FilterLiveSearch,
  List,
  ListToolbar,
  SavedQueriesList,
  SearchInput,
  SelectInput,
  SortButton,
  ToggleFilterButton,
  TopToolbar,
} from "@chelone/vue";

const toolbarFilters = [
  {
    source: "sku",
    component: SearchInput,
    props: { placeholder: "Find by SKU", class: "w-56" },
    alwaysOn: true,
  },
  {
    source: "shipping_class",
    label: "Shipping class",
    component: SelectInput,
    props: { choices: shippingClassChoices },
  },
];
</script>

<template>
  <List resource="products" :per-page="10">
    <template #actions>
      <TopToolbar class="mb-0">
        <SortButton
          :fields="['name', 'price', 'stock', 'rating']"
          label="Sort by {field} ({order})"
        />
        <CreateButton />
      </TopToolbar>
    </template>
    <div class="flex items-start gap-6">
      <aside class="flex w-56 shrink-0 flex-col gap-6">
        <FilterLiveSearch placeholder="Search products" />
        <FilterList label="Category">
          <FilterListItem
            v-for="choice in categoryChoices"
            :key="choice.id"
            :label="choice.name"
            :value="{ category: choice.id }"
          />
        </FilterList>
        <FilterList label="Shipping">
          <FilterListItem
            v-for="choice in shippingClassChoices"
            :key="choice.id"
            :label="choice.name"
            :value="{ shipping_class: choice.id }"
          />
        </FilterList>
        <FilterListSection label="Availability">
          <div class="flex flex-wrap gap-2 px-2">
            <ToggleFilterButton label="Out of stock" :value="{ stock: 0 }" />
            <ToggleFilterButton label="Featured" :value="{ featured: true }" />
          </div>
        </FilterListSection>
        <FilterListSection label="Saved queries">
          <div class="px-2">
            <SavedQueriesList />
          </div>
        </FilterListSection>
      </aside>
      <div class="min-w-0 flex-1">
        <ListToolbar
          :filters="toolbarFilters"
          :has-create="false"
          :exporter="false"
          class="mb-4"
        />
        <DataTable>
          <DataTableCol source="name" />
          <DataTableCol source="sku" />
          <DataTableCol source="category" />
          <DataTableNumberCol
            source="price"
            :options="{ style: 'currency', currency: 'USD' }"
          />
          <DataTableNumberCol source="stock" />
        </DataTable>
      </div>
    </div>
  </List>
</template>
