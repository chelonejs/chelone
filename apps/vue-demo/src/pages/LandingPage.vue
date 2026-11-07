<script lang="ts">
export const title = "Landing page";
export const group = "Content";
</script>

<script setup lang="ts">
/**
 * The Landing page, the Vue twin of `apps/demo`'s: the shop's storefront page
 * as one block document, edited on the left and previewed read-only on the
 * right as it is typed. The document holds copy, a callout, two charts and a
 * record list; the charts and the list read the shop's `orders` and `products`
 * when they render.
 */

import { landingPageDocument } from "@chelone/demo-data";
import { useForm } from "@chelone/vue";
import {
  BlockDocField,
  BlockEditorInput,
  dataBlocks,
  defaultBlocks,
} from "@chelone/vue/block-editor";
import { computed } from "vue";

const blocks = [...defaultBlocks, ...dataBlocks];

interface LandingValues {
  // `BlockDocNode` is recursive, which form-core's path types cannot follow.
  body: object | null;
}

const { values } = useForm<LandingValues>({
  record: { body: landingPageDocument() },
  onSubmit: async () => undefined,
});

const record = computed(() => ({ id: 1, body: values.value.body }));
</script>

<template>
  <div class="grid items-start gap-6 lg:grid-cols-2">
    <section aria-label="Landing page editor" class="min-w-0">
      <BlockEditorInput
        source="body"
        label="Landing page"
        :blocks="blocks"
        helper-text="Type / on an empty line to insert a block."
      />
    </section>
    <section aria-label="Landing page preview" class="min-w-0">
      <h2 class="mb-2 text-sm font-medium">Preview</h2>
      <BlockDocField
        source="body"
        :record="record"
        :blocks="blocks"
        empty="Nothing to preview yet"
        class="rounded-md border p-3"
      />
    </section>
  </div>
</template>
