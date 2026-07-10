<script lang="ts">
/** Props for {@link InputHelperText}. */
export interface InputHelperTextProps {
  /** A string is translated + wrapped in `<FieldDescription>`; `false`/`null` renders nothing. */
  helperText?: string | false;
}
</script>

<script setup lang="ts">
/**
 * `<InputHelperText>` — renders helper/hint text below a form input, with
 * automatic translation. The Vue twin of `@chelone/react`'s
 * `common/input-helper-text.tsx`.
 *
 * - `helperText === false` / `null` / `""` → renders nothing;
 * - a string → translated (echoing itself on a miss) inside `<FieldDescription>`;
 * - a custom node → pass it via the DEFAULT SLOT; it renders RAW (no
 *   `<FieldDescription>` wrapper), mirroring the React twin's `isValidElement`
 *   branch which returns the node verbatim.
 *
 * @internal
 */

import { computed, useSlots } from "vue";
import { FieldDescription } from "../../ui/field";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<InputHelperTextProps>();
const slots = useSlots();

const translate = useTranslate();
const text = computed(() => {
  const helperText = props.helperText;
  if (helperText === false || helperText == null || helperText === "") {
    return null;
  }
  return translate(helperText, { _: helperText });
});
</script>

<template>
  <slot v-if="slots.default" />
  <FieldDescription v-else-if="text != null">{{ text }}</FieldDescription>
</template>
