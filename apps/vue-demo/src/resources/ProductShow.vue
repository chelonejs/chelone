<script setup lang="ts">
/**
 * `<ProductShow>` — the product detail page, the Vue twin of `apps/demo`'s
 * `ProductShow`. A summary strip (price, rating, SKU, availability) sits above
 * three tabs: Overview, Media and Raw data. Previous and next lead the actions,
 * so they stay put while the other buttons come and go.
 */

import { isLooseRecord, type ResourceRecord } from "@chelone/core";
import { categoryChoices, shippingClassChoices } from "@chelone/demo-data";
import {
  CardContentInner,
  ChipField,
  CloneButton,
  ColorField,
  CurrencyField,
  DeleteButton,
  FileField,
  FunctionField,
  ImageField,
  JsonField,
  Labeled,
  ListButton,
  NumberField,
  PrevNextButtons,
  RatingField,
  SelectField,
  Show,
  TabbedShowLayout,
  TabbedShowLayoutTab,
  TextArrayField,
  UrlField,
  WrapperField,
} from "@chelone/vue";

/** What a shopper is told about `stock`. */
function availability(record: ResourceRecord): string {
  const count = isLooseRecord(record) ? Number(record.stock) : Number.NaN;
  if (count === 0) return "Out of stock";
  return count < 10 ? `Low stock: ${count} left` : "In stock";
}
</script>

<template>
  <Show resource="products">
    <template #actions>
      <div class="flex flex-wrap items-center gap-2">
        <PrevNextButtons link-type="show" />
        <ListButton />
        <CloneButton />
        <DeleteButton />
      </div>
    </template>
    <div
      class="flex max-w-3xl flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm"
    >
      <CardContentInner
        class="flex flex-wrap items-end gap-x-6 gap-y-2"
      >
        <Labeled>
          <CurrencyField
            source="price"
            currency="USD"
            class="text-2xl font-semibold"
          />
        </Labeled>
        <Labeled>
          <RatingField source="rating" allow-half />
        </Labeled>
        <ChipField source="sku" />
        <FunctionField
          source="stock"
          class="text-sm text-muted-foreground"
          v-slot="{ record }"
        >
          {{ availability(record) }}
        </FunctionField>
      </CardContentInner>
      <CardContentInner>
        <TabbedShowLayout>
          <TabbedShowLayoutTab label="Overview">
            <SelectField source="category" :choices="categoryChoices" />
            <NumberField source="stock" />
            <WrapperField label="Fulfilment">
              <div class="flex flex-wrap items-center gap-2">
                <SelectField
                  source="shipping_class"
                  :choices="shippingClassChoices"
                />
                <TextArrayField source="channels" />
              </div>
            </WrapperField>
            <TextArrayField source="keywords" />
          </TabbedShowLayoutTab>
          <TabbedShowLayoutTab label="Media">
            <ImageField
              source="image"
              title="Product photo"
              class="[&_img]:max-w-xs [&_img]:rounded-md"
            />
            <ColorField source="color" />
            <FileField source="spec_sheet" title="Download PDF" />
            <Labeled label="URL">
              <UrlField source="url" />
            </Labeled>
          </TabbedShowLayoutTab>
          <TabbedShowLayoutTab label="Raw data">
            <JsonField source="variants" />
          </TabbedShowLayoutTab>
        </TabbedShowLayout>
      </CardContentInner>
    </div>
  </Show>
</template>
