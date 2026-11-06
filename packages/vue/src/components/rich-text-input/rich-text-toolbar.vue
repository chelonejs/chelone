<script lang="ts">
import type { Editor } from "@tiptap/core";

/** Props for {@link RichTextToolbar}. */
export interface RichTextToolbarProps {
  /** The editor to format. `@tiptap/vue-3` has no editor context, so it is passed in. */
  editor: Editor;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<RichTextToolbar>` — the formatting toolbar of `<RichTextInput>`: a block
 * type select and one button per formatting command, listed by core's
 * `richTextToolbarItems`. The Vue twin of `@chelone/react`'s
 * `rich-text-input/rich-text-toolbar.tsx`; it takes the editor as a prop, so it
 * works in the input's `#toolbar` slot, which receives `{ editor }`.
 *
 * @example
 * import { RichTextInput, RichTextToolbar } from "@chelone/vue/rich-text-input";
 *
 * <RichTextInput source="body">
 *   <template #toolbar="{ editor }">
 *     <RichTextToolbar :editor="editor" class="p-2" />
 *   </template>
 * </RichTextInput>
 */

import {
  type RichTextToolbarItem,
  richTextBlockTypes,
  richTextToolbarItems,
} from "@chelone/core";
import { computed, shallowRef, watch } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import Button from "../ui/button.vue";
import {
  type ButtonState,
  formatShortcut,
  hasRichTextColor,
  itemSpecs,
  readToolbarState,
  setBlockType,
} from "./rich-text-commands";
import { richTextColorIcon, richTextIcons, richTextImageIcon } from "./rich-text-icons";
import { getRichTextImageConfig } from "./rich-text-image";
import RichTextColor from "./rich-text-color.vue";
import RichTextImageForm from "./rich-text-image-form.vue";
import RichTextLinkForm from "./rich-text-link-form.vue";

const props = defineProps<RichTextToolbarProps>();

const translate = useTranslate();
const state = shallowRef(readToolbarState(props.editor));
const linkOpen = shallowRef(false);
const imageOpen = shallowRef(false);
const colorOpen = shallowRef(false);
const hasImages = computed(() => getRichTextImageConfig(props.editor) !== null);
const hasColors = computed(() => hasRichTextColor(props.editor));

// tiptap's own `editor.state` ref updates two frames late, so the toolbar reads
// the editor itself after each transaction. `setEditable` and a new
// placeholder dispatch an empty one, so those reach it too.
watch(
  () => props.editor,
  (editor, _previous, onCleanup) => {
    const refresh = () => {
      state.value = readToolbarState(editor);
    };
    refresh();
    editor.on("transaction", refresh);
    onCleanup(() => editor.off("transaction", refresh));
  },
  { immediate: true },
);

// A run of items in one group; core lists Link and Horizontal rule apart.
const groups = computed(() => {
  const result: {
    group: RichTextToolbarItem["group"];
    entries: { item: RichTextToolbarItem; button: ButtonState }[];
  }[] = [];
  richTextToolbarItems.forEach((item, index) => {
    const button = state.value.buttons[index];
    if (!button) return;
    const last = result.at(-1);
    if (last?.group === item.group) last.entries.push({ item, button });
    else result.push({ group: item.group, entries: [{ item, button }] });
  });
  return result;
});

function label(item: RichTextToolbarItem): string {
  return translate(item.labelKey, { _: item.defaultLabel });
}

function tooltip(item: RichTextToolbarItem): string {
  return item.shortcut
    ? `${label(item)} (${formatShortcut(item.shortcut)})`
    : label(item);
}

function onClick(item: RichTextToolbarItem) {
  const run = itemSpecs[item.id].run;
  if (run) run(props.editor);
  else linkOpen.value = !linkOpen.value;
}

function onBlockType(event: Event) {
  if (event.target instanceof HTMLSelectElement)
    setBlockType(props.editor, event.target.value);
}
</script>

<template>
  <div data-slot="rich-text-toolbar-root" class="border-b">
    <div
      role="toolbar"
      :aria-label="translate('chelone.rich_text.toolbar', { _: 'Formatting' })"
      data-slot="rich-text-toolbar"
      :class="cn('flex flex-wrap items-center gap-1 p-1', props.class)"
    >
      <select
        data-slot="native-select"
        class="h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50"
        :aria-label="translate('chelone.rich_text.block_type', { _: 'Block type' })"
        :value="state.blockType"
        :disabled="!state.editable"
        @change="onBlockType"
      >
        <option v-for="type in richTextBlockTypes" :key="type.id" :value="type.id">
          {{ translate(type.labelKey, { _: type.defaultLabel }) }}
        </option>
      </select>
      <div
        v-for="{ entries } in groups"
        :key="entries[0]?.item.id"
        class="flex items-center gap-1"
      >
        <span aria-hidden="true" class="mx-1 h-6 w-px bg-border" />
        <template v-for="{ item, button } in entries" :key="item.id">
          <Button
            :variant="button.pressed ? 'secondary' : 'ghost'"
            size="icon"
            :aria-label="label(item)"
            :title="tooltip(item)"
            :aria-pressed="button.pressed"
            :aria-expanded="item.id === 'link' ? linkOpen : undefined"
            :disabled="button.disabled"
            @mousedown.prevent
            @click="onClick(item)"
          >
            <component :is="richTextIcons[item.id]" />
          </Button>
          <Button
            v-if="item.id === 'code' && hasColors"
            variant="ghost"
            size="icon"
            :aria-label="translate('chelone.rich_text.color', { _: 'Text color' })"
            :title="translate('chelone.rich_text.color', { _: 'Text color' })"
            :aria-expanded="colorOpen"
            :disabled="!state.editable"
            @mousedown.prevent
            @click="colorOpen = !colorOpen"
          >
            <component :is="richTextColorIcon" />
          </Button>
          <Button
            v-if="item.id === 'link' && hasImages"
            variant="ghost"
            size="icon"
            :aria-label="translate('chelone.rich_text.image', { _: 'Image' })"
            :aria-expanded="imageOpen"
            :disabled="!state.editable"
            @mousedown.prevent
            @click="imageOpen = !imageOpen"
          >
            <component :is="richTextImageIcon" />
          </Button>
        </template>
      </div>
    </div>
    <RichTextImageForm
      v-if="imageOpen && hasImages"
      :editor="editor"
      @close="imageOpen = false"
    />
    <RichTextColor v-if="colorOpen && hasColors" :editor="editor" />
    <RichTextLinkForm
      v-if="linkOpen"
      :editor="editor"
      @close="linkOpen = false"
    />
  </div>
</template>
