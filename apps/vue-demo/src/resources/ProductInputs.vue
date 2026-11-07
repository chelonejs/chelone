<script setup lang="ts">
/**
 * The product form, shared by `<ProductEdit>` and `<ProductCreate>` (the Vue
 * twin of `ProductInputs` in `apps/demo`). `price` and `stock` start at 0; the
 * seed stores a spec sheet as its URL, so `specSheetEntry` hands the preview a
 * `{ src, title }`.
 */

import type { FileSelection } from "@chelone/core";
import {
  categoryChoices,
  channelChoices,
  shippingClassChoices,
  tagChoices,
} from "@chelone/demo-data";
import {
  CheckboxGroupInput,
  ColorInput,
  CurrencyInput,
  FileField,
  FileInput,
  ImageInput,
  NullableBooleanInput,
  NumberInput,
  RadioButtonGroupInput,
  RatingInput,
  ResettableTextInput,
  SelectArrayInput,
  SelectInput,
  TextArrayInput,
  TextInput,
} from "@chelone/vue";

function specSheetEntry(value: FileSelection): FileSelection {
  if (typeof value !== "string") return value;
  return { src: value, title: value.split("/").pop() };
}
</script>

<template>
  <div class="flex flex-col gap-4 max-w-xl">
    <TextInput source="name" />
    <ResettableTextInput source="sku" />
    <SelectInput source="category" :choices="categoryChoices" />
    <CurrencyInput source="price" currency="USD" :default-value="0" />
    <NumberInput source="stock" :min="0" :default-value="0" />
    <RatingInput source="rating" allow-half />
    <ColorInput source="color" />
    <ImageInput source="image" />
    <FileInput
      source="spec_sheet"
      accept="application/pdf"
      :format="specSheetEntry"
    >
      <FileField source="src" title="title" />
    </FileInput>
    <CheckboxGroupInput source="channels" :choices="channelChoices" />
    <RadioButtonGroupInput
      source="shipping_class"
      :choices="shippingClassChoices"
      row
    />
    <SelectArrayInput source="tags" :choices="tagChoices" />
    <TextArrayInput source="keywords" />
    <NullableBooleanInput source="featured" label="Featured" />
  </div>
</template>
