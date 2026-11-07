<script setup lang="ts">
/**
 * `<PreviewPlaceForm>` — a form seeded with `previewPlace`, for the map inputs:
 * each edits one of its fields and shows no page title or save button. The Vue
 * twin of the website's React `PreviewPlaceForm`.
 */

import { Create } from "@chelone/vue";
import PreviewMaps from "./PreviewMaps.vue";
import { previewPlace } from "./preview-place";
</script>

<template>
  <PreviewMaps>
    <div class="flex w-full max-w-xl flex-col gap-4">
      <Create resource="places" :record="previewPlace" title="">
        <slot />
      </Create>
    </div>
  </PreviewMaps>
</template>
