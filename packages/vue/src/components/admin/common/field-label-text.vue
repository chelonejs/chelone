<script lang="ts">
/** Props for {@link FieldLabelText}. */
export interface FieldLabelTextProps {
  /** The field path; humanized (or key-translated) when no `label` is given. */
  source?: string;
  /** Target resource for the translation key; defaults to the ambient resource. */
  resource?: string;
  /** A string is translated; `false`/`""` renders nothing. Pass a node via the default slot. */
  label?: string | false;
  /** Append a thin-space `*` required marker after the label. */
  isRequired?: boolean;
}
</script>

<script setup lang="ts">
/**
 * `<FieldLabelText>` — renders a field/input's resolved, translated label text
 * (+ an optional required marker). The Vue twin of `@chelone/react`'s
 * `common/field-label-text.tsx`: keeps the headless `useTranslateLabel` logic,
 * drops the RA `<FieldTitle>` component. Composes inside a shadcn `<FieldLabel>`
 * for inputs, or standalone for table headers / record fields.
 *
 * Vue divergence from the React twin: React accepts a `ReactNode` label and
 * returns it verbatim when it is not a string. Vue keeps the `label` PROP
 * string-typed and instead renders the DEFAULT SLOT verbatim (no translation,
 * no required marker) when one is provided — the Vue-idiomatic way to pass
 * custom label markup. With no slot, the string/undefined `label` flows through
 * `useTranslateLabel` exactly as in React.
 */

import { computed, useSlots } from "vue";
import { useTranslateLabel } from "../../../label/use-translate-label";

// `label` includes `false`, so Vue would treat it as a Boolean-inclusive prop
// and coerce an ABSENT `label` to `false` — which would wrongly hide the label
// on `<FieldLabelText source="title" />`. An explicit `undefined` default
// disables that boolean casting, so absent → `undefined` (humanize the source)
// while an explicit `:label="false"` still renders nothing.
const props = withDefaults(defineProps<FieldLabelTextProps>(), {
  label: undefined,
});
const slots = useSlots();

const translateLabel = useTranslateLabel();
const text = computed(() =>
  translateLabel({
    source: props.source,
    label: props.label,
    resource: props.resource,
  }),
);
</script>

<template>
  <slot v-if="slots.default" />
  <span v-else-if="text != null"
    >{{ text }}<span v-if="isRequired" aria-hidden="true">&thinsp;*</span></span
  >
</template>
