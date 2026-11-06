<script setup lang="ts">
/**
 * The view of the image block: the image, or an empty state when the source
 * is missing or not safe to load.
 */

import { isSafeImageSrc } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import type { ImageAttrs } from "./default-blocks";

const props = defineProps<{
  attrs: ImageAttrs;
  mode: "edit" | "read";
  selected?: boolean;
  updateAttrs?: (attrs: Partial<ImageAttrs>) => void;
}>();

const translate = useTranslate();
const safe = computed(
  () =>
    props.attrs.src !== "" &&
    isSafeImageSrc(props.attrs.src, { allowDataImages: true }),
);
</script>

<template>
  <img
    v-if="safe"
    :src="attrs.src"
    :alt="attrs.alt"
    :style="{ width: `${attrs.widthPct}%` }"
    class="my-2 h-auto max-w-full rounded-md"
  />
  <div
    v-else
    class="my-2 rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm"
  >
    {{ translate("chelone.block_editor.image.empty", { _: "Add an image" }) }}
  </div>
</template>
