<script lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
import type {
  LooseRecord,
  ResourceRecord,
  SourceProp,
  SourceValue,
} from "@chelone/core";
import {
  sanitizeRichTextImageElement,
  sanitizeRichTextStyle,
} from "@chelone/core";
import DOMPurify from "dompurify";

let purify: ReturnType<typeof DOMPurify> | undefined;
function sanitizer() {
  if (!purify) {
    purify = DOMPurify(window);
    purify.addHook("afterSanitizeAttributes", sanitizeRichTextImageElement);
    // `style` is allowed through the options; only a palette or plain color survives.
    purify.addHook("uponSanitizeAttribute", (_node, data) => {
      if (data.attrName !== "style") return;
      const style = sanitizeRichTextStyle(data.attrValue);
      if (style === null) data.keepAttr = false;
      else data.attrValue = style;
    });
  }
  return purify;
}

/** Props for {@link RichTextField}. */
export interface RichTextFieldProps<
  RecordType extends ResourceRecord = LooseRecord,
> {
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

<script setup lang="ts" generic="RecordType extends ResourceRecord = LooseRecord">
/**
 * `<RichTextField>` — shows a stored HTML value, sanitized with DOMPurify and
 * the core `richTextStyledSanitizeOptions`: scripts, event handlers, frames and
 * form controls are removed before the HTML reaches the DOM, and a `style`
 * attribute survives only as a palette, hex, `rgb()` or `hsl()` `color`. Code
 * blocks show without highlighting. The Vue twin of `@chelone/react`'s
 * `rich-text-input/rich-text-field.tsx`.
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

import { richTextStyledSanitizeOptions } from "@chelone/core";
import { computed, type VNode } from "vue";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import { useFieldValue } from "../../record/use-field-value";
import "./rich-text.css";

// DOMPurify's `Config` takes mutable arrays, and core's options are frozen.
const sanitizeConfig = {
  FORBID_TAGS: [...richTextStyledSanitizeOptions.FORBID_TAGS],
  FORBID_ATTR: [...richTextStyledSanitizeOptions.FORBID_ATTR],
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
const clean = computed(() => sanitizer().sanitize(html.value, sanitizeConfig));
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
