<script lang="ts">
import type { LooseRecord, SourceProp } from "@chelone/core";

/** Props for {@link UrlField}. */
export interface UrlFieldProps {
  source: SourceProp;
  record?: LooseRecord;
  defaultValue?: unknown;
  empty?: string;
  /** Anchor `target` (e.g. `_blank`). */
  target?: string;
  /** Anchor `rel`; defaults to `noopener noreferrer` when `target="_blank"`. */
  rel?: string;
  /** Link text; defaults to the URL value itself. */
  content?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<UrlField>` — displays a URL as a clickable hyperlink, the Vue analog of
 * `@chelone/react`'s `fields/url-field.tsx`. Reads the value at `source` off
 * the ambient record. The click is `.stop`-ped (safe inside a `DataTable` row
 * with `rowClick`). Refuses to render an anchor for unsafe schemes (e.g.
 * `javascript:`), falling back to plain text. A nullish/empty value renders the
 * `empty` fallback (or nothing).
 */

import { computed } from "vue";
import { cn } from "../../../lib/utils";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<UrlFieldProps>();

const value = useFieldValue({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const translate = useTranslate();

// Allowlist of safe URL schemes / prefixes — blocks `javascript:`, `data:`, and
// other XSS-prone URLs from becoming live links.
const SAFE_URL_PATTERN = /^(https?:|mailto:|tel:|\/|#)/i;

const url = computed(() => {
  const raw = value.value;
  if (raw == null || raw === "") return null;
  return String(raw);
});

const isSafe = computed(
  () => url.value != null && SAFE_URL_PATTERN.test(url.value.trim()),
);

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);

// Default to a secure rel when opening a new tab, unless the caller set one.
const safeRel = computed(() =>
  props.target === "_blank" && props.rel == null
    ? "noopener noreferrer"
    : props.rel,
);

const linkClass = computed(() => cn("underline hover:no-underline", props.class));
</script>

<template>
  <a
    v-if="url != null && isSafe"
    data-slot="url-field"
    :class="linkClass"
    :href="url"
    :target="target"
    :rel="safeRel"
    @click.stop
    >{{ content ?? url }}</a
  >
  <span
    v-else-if="url != null"
    data-slot="url-field"
    :class="props.class"
    >{{ url }}</span
  >
  <span
    v-else-if="emptyText != null"
    data-slot="url-field"
    :class="props.class"
    >{{ emptyText }}</span
  >
</template>
