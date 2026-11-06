<script lang="ts">
import type { Editor } from "@tiptap/core";

/** Props for {@link RichTextColor}. */
export interface RichTextColorProps {
  editor: Editor;
}
</script>

<script setup lang="ts">
/**
 * `<RichTextColor>` — the inline panel the toolbar's Text color button opens:
 * swatches grouped by palette. A swatch colors the selection; Default clears
 * the color. The Vue twin of `@chelone/react`'s
 * `rich-text-input/rich-text-color.tsx`.
 */

import {
  type RichTextColor,
  type RichTextColorPalette,
  richTextColors,
} from "@chelone/core";
import { shallowRef, watch } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import Button from "../ui/button.vue";
import { currentRichTextColor } from "./rich-text-commands";

const PALETTE_LABELS: Record<RichTextColorPalette, string> = {
  default: "Default",
  bright: "Bright",
  soft: "Soft",
  muted: "Muted",
};

const groups: { palette: RichTextColorPalette; colors: RichTextColor[] }[] = [];
for (const color of richTextColors) {
  const last = groups.at(-1);
  if (last?.palette === color.palette) last.colors.push(color);
  else groups.push({ palette: color.palette, colors: [color] });
}

const props = defineProps<RichTextColorProps>();

const translate = useTranslate();
const current = shallowRef(currentRichTextColor(props.editor));
const editable = shallowRef(props.editor.isEditable);

// Like the toolbar, this reads the editor after each transaction.
watch(
  () => props.editor,
  (editor, _previous, onCleanup) => {
    const refresh = () => {
      current.value = currentRichTextColor(editor);
      editable.value = editor.isEditable;
    };
    refresh();
    editor.on("transaction", refresh);
    onCleanup(() => editor.off("transaction", refresh));
  },
  { immediate: true },
);

function pick(color: RichTextColor) {
  const chain = props.editor.chain().focus();
  if (color.value === null) chain.unsetColor().run();
  else chain.setColor(color.value).run();
}
</script>

<template>
  <div
    data-slot="rich-text-color"
    class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t p-2"
  >
    <fieldset
      v-for="{ palette, colors } in groups"
      :key="palette"
      :aria-label="
        translate(`chelone.rich_text.color_palette.${palette}`, {
          _: PALETTE_LABELS[palette],
        })
      "
      class="m-0 flex min-w-0 items-center gap-1 border-0 p-0"
    >
      <Button
        v-for="color in colors"
        :key="color.id"
        variant="outline"
        size="icon"
        :title="translate(color.labelKey, { _: color.defaultLabel })"
        :aria-label="translate(color.labelKey, { _: color.defaultLabel })"
        :aria-pressed="color.value === current"
        :disabled="!editable"
        :class="
          cn(
            'size-6 rounded-full',
            color.value === null && 'text-xs',
            color.value === current && 'ring-2 ring-ring',
          )
        "
        :style="color.value ? { backgroundColor: color.value } : undefined"
        @mousedown.prevent
        @click="pick(color)"
      >{{ color.value === null ? "A" : null }}</Button>
    </fieldset>
  </div>
</template>
