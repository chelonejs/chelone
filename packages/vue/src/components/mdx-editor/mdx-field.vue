<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { CrepeEditorConfig } from "./internal/crepe-editor.vue";

/** Props for {@link MdxField}. */
export interface MdxFieldProps {
  source: SourceProp;
  record?: LooseRecord;
  /** Used when the record has no value at `source`. */
  defaultValue?: unknown;
  /** Shown as the markdown when the value is missing; translated if it is a message key. */
  empty?: string;
  /** Merged under the read-only defaults; `code-mirror` and `latex` stay off. */
  crepeConfig?: CrepeEditorConfig;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<MdxField>` — shows a markdown field value in a read-only Crepe editor. The
 * Vue counterpart of `@chelone/react`'s `mdx-editor/mdx-field.tsx`; it wraps
 * Milkdown's Crepe because `@mdxeditor/editor` is React only.
 *
 * Needs the optional `@milkdown/crepe` and `@milkdown/kit` peers. From npm, also
 * import `@chelone/vue/mdx-editor.css` for the Chelone theme; the registry item
 * ships that file with the component. The `#empty` slot replaces the editor
 * when the value is missing.
 *
 * @example
 * import { MdxField } from "@chelone/vue/mdx-editor";
 *
 * <MdxField source="body" empty="No content" />
 */

import { computed, type VNode } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import CrepeEditor from "./internal/crepe-editor.vue";

const props = defineProps<MdxFieldProps>();

defineSlots<{ empty?: () => VNode[] }>();

const translate = useTranslate();
const value = useFieldValue({
  source: props.source,
  get record() {
    return props.record;
  },
  get defaultValue() {
    return props.defaultValue;
  },
});

const missing = computed(() => value.value == null);
const markdown = computed(() => {
  const raw = value.value;
  if (raw == null) {
    return props.empty ? translate(props.empty, { _: props.empty }) : "";
  }
  return typeof raw === "string" ? raw : String(raw);
});
</script>

<template>
  <slot v-if="missing && $slots.empty" name="empty" />
  <CrepeEditor
    v-else
    :markdown="markdown"
    readonly
    :crepe-config="crepeConfig"
    :class="cn(props.class)"
  />
</template>
