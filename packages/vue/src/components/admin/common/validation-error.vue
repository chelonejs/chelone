<script lang="ts">
/** Props for {@link ValidationError}. */
export interface ValidationErrorProps {
  error?: string | TranslatableMessage;
}
</script>

<script setup lang="ts">
/**
 * `<ValidationError>` — renders a Chelone field error as translated text, the
 * Vue analog of `@chelone/react`'s `field-error-display.tsx#ValidationError`.
 *
 * The error is ALREADY the displayable `string | TranslatableMessage`
 * (`useInput`/`firstFieldError` ran core's `normalizeFormError`), so this NEVER
 * touches an `error.root.message` / `@@react-admin@@` shape:
 * - a `{ message, args }` payload → `translate(message, args)` (interpolated);
 * - a plain string → `translate(string)` (key echoed on a miss);
 * - `undefined`/`""` → renders nothing.
 */

import type { TranslatableMessage } from "@chelone/core";
import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<ValidationErrorProps>();

const translate = useTranslate();

const text = computed(() => {
  const error = props.error;
  if (error == null || error === "") return null;
  if (typeof error === "string") return translate(error);
  return translate(error.message, error.args);
});
</script>

<template>
  <span v-if="text != null">{{ text }}</span>
</template>
