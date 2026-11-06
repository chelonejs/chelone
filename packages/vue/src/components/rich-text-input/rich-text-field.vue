<script lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
import type { LooseRecord, SourceProp, SourceValue } from "@chelone/core";

/** Props for {@link RichTextField}. */
export interface RichTextFieldProps<RecordType extends LooseRecord = LooseRecord> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  /** Used when the record has no value at `source`. */
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  /** Shown as text when the value is empty; translated if it is a message key. */
  empty?: string;
  /** Shows the text of the HTML, with no elements. */
  stripTags?: boolean;
  class?: string;
}
</script>

<script setup lang="ts" generic="RecordType extends LooseRecord = LooseRecord">
/**
 * `<RichTextField>` — shows a stored HTML value, sanitized with DOMPurify and
 * the core `richTextSanitizeOptions`: scripts, event handlers, `style`, frames
 * and form controls are removed before the HTML reaches the DOM. The Vue twin of
 * `@chelone/react`'s `rich-text-input/rich-text-field.tsx`.
 *
 * Needs the optional `dompurify` peer. From npm, import
 * `@chelone/vue/rich-text-input.css` once for the content styles; the registry
 * item ships that file with the component. The `#empty` slot replaces the
 * `empty` text when the value is empty.
 *
 * @example
 * import { RichTextField } from "@chelone/vue/rich-text-input";
 *
 * <RichTextField source="body" empty="No content" />
 */

import { richTextSanitizeOptions } from "@chelone/core";
import DOMPurify from "dompurify";
import { computed, type VNode } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import "./rich-text.css";

// DOMPurify's `Config` takes mutable arrays, and core's options are frozen.
const sanitizeConfig = {
  FORBID_TAGS: [...richTextSanitizeOptions.FORBID_TAGS],
  FORBID_ATTR: [...richTextSanitizeOptions.FORBID_ATTR],
};

const props = defineProps<RichTextFieldProps<RecordType>>();

defineSlots<{ empty?: () => VNode[] }>();

const value = useFieldValue<RecordType>({
  source: props.source,
  get record() {
    return props.record;
  },
  get defaultValue() {
    return props.defaultValue;
  },
});
const translate = useTranslate();

const html = computed(() => {
  const raw = value.value;
  if (raw == null) return "";
  return typeof raw === "string" ? raw : String(raw);
});
const clean = computed(() => DOMPurify.sanitize(html.value, sanitizeConfig));
const text = computed(
  () =>
    new DOMParser().parseFromString(clean.value, "text/html").body
      .textContent ?? "",
);
const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : "",
);
</script>

<template>
  <template v-if="html === '' && ($slots.empty || empty)">
    <slot name="empty">{{ emptyText }}</slot>
  </template>
  <div
    v-else-if="stripTags"
    data-slot="rich-text-field"
    :class="cn('rich-text', props.class)"
  >{{ text }}</div>
  <div
    v-else
    data-slot="rich-text-field"
    :class="cn('rich-text', props.class)"
    v-html="clean"
  />
</template>
