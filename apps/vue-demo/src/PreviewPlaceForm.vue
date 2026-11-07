<script setup lang="ts">
/**
 * `<PreviewPlaceForm>` — the Vue twin of the website's React `PreviewPlaceForm`
 * (`apps/website/src/docs/mdx/preview-maps.tsx`): a form seeded with
 * `previewPlace`, for the map inputs. Each edits one of its fields, and the form
 * shows no page title or save button. The map services come from
 * `maps-services.ts`; they suit demos only.
 */

import { Create } from "@chelone/vue";
import { MapsProvider } from "@chelone/vue/maps";
import { previewPlace } from "../../website/src/docs/mdx/preview-place";
import { mapsConfig } from "./maps-services";
</script>

<template>
  <MapsProvider v-bind="mapsConfig">
    <div class="flex w-full max-w-xl flex-col gap-4">
      <Create :record="previewPlace" title="">
        <slot />
      </Create>
    </div>
  </MapsProvider>
</template>
