<script lang="ts">
/** Props for {@link PasswordInput}. */
export interface PasswordInputProps {
  source: SourceProp;
  label?: string | false;
  initiallyVisible?: boolean;
  defaultValue?: string;
  validate?: Validator | readonly Validator[];
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  autocomplete?: string;
  autofocus?: boolean;
  inputClass?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<PasswordInput>` — text input for passwords with a reveal toggle, the Vue
 * analog of `@chelone/react`'s `inputs/password-input.tsx`. Wraps `<TextInput>`
 * and forces `type="password"`; the ghost button flips the type to `text` (and
 * back) so the value can be read. `initiallyVisible` renders it plain on mount.
 *
 * Icon note: the Vue slice is dependency-free (no `lucide-vue-next`), so the
 * eye / eye-off glyphs are inlined SVGs mirroring lucide's paths.
 */

import type { SourceProp, Validator } from "@chelone/core";
import { computed, ref } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import TextInput from "./text-input.vue";

const props = withDefaults(defineProps<PasswordInputProps>(), {
  label: undefined,
});

const visible = ref(props.initiallyVisible === true);
const translate = useTranslate();

const toggleLabel = computed(() =>
  visible.value
    ? translate("chelone.input.password.toggle_visible", { _: "Hide password" })
    : translate("chelone.input.password.toggle_hidden", { _: "Show password" }),
);
</script>

<template>
  <TextInput
    :source="source"
    :label="label"
    :type="visible ? 'text' : 'password'"
    :default-value="defaultValue"
    :validate="validate"
    :helper-text="helperText"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :autocomplete="autocomplete"
    :autofocus="autofocus"
    :class="props.class"
    :input-class="cn('pr-10', inputClass)"
  >
    <template #controlSuffix>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="absolute top-1/2 right-1 size-7 -translate-y-1/2 text-muted-foreground"
        :aria-label="toggleLabel"
        :tabindex="-1"
        @click="visible = !visible"
      >
        <svg
          v-if="visible"
          xmlns="http://www.w3.org/2000/svg"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <line x1="2" x2="22" y1="2" y2="22" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </Button>
    </template>
  </TextInput>
</template>
