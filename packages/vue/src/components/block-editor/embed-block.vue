<script setup lang="ts">
/**
 * The view of the embed block: a YouTube or Vimeo video in a sandboxed
 * iframe. Any other URL shows an empty state.
 */

import { toEmbedSrc } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import type { EmbedAttrs } from "./default-blocks";

const props = defineProps<{
  attrs: EmbedAttrs;
  mode: "edit" | "read";
  selected?: boolean;
  updateAttrs?: (attrs: Partial<EmbedAttrs>) => void;
}>();

const translate = useTranslate();
const src = computed(() => toEmbedSrc(props.attrs.url));
</script>

<template>
  <iframe
    v-if="src !== null"
    :src="src"
    :title="translate('chelone.block_editor.embed.title', { _: 'Embedded video' })"
    sandbox="allow-scripts allow-same-origin allow-presentation"
    referrerpolicy="strict-origin-when-cross-origin"
    allowfullscreen
    class="my-2 aspect-video w-full rounded-md border"
  />
  <div
    v-else
    class="my-2 rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm"
  >
    {{ translate("chelone.block_editor.embed.empty", { _: "Add a YouTube or Vimeo link" }) }}
  </div>
</template>
