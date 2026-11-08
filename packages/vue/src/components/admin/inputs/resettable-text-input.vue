<script lang="ts">
import type { SourceProp } from "@chelone/core";

/** Props for {@link ResettableTextInput}. */
export interface ResettableTextInputProps {
  source: SourceProp;
  label?: string | false;
  resettable?: boolean;
  clearAlwaysVisible?: boolean;
  defaultValue?: string;
  validate?: Validator | readonly Validator[];
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  inputClass?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ResettableTextInput>` — a text input with a clear (×) button that resets the
 * field value, the Vue analog of `@chelone/react`'s
 * `inputs/resettable-text-input.tsx`. Wraps `<TextInput>` and overlays a ghost
 * button on the control through its `controlSuffix` slot, so the button is centred
 * on the control with or without a label, helper text or an error. It appears only
 * when the field has a value (unless `clearAlwaysVisible`). Clicking it writes `""`
 * (an empty string, not `null` — consistent with the coercion fix) so the control
 * stays a controlled string.
 *
 * Rebridge note: the React twin read the live value via the `useWatch` RHF shim
 * and cleared via `form.ambient.setFieldValue`. Here we OBSERVE the ambient form store
 * (a read-only `useSubscribable` over `form.ambient.store` — no second field
 * registration) and clear via the same `form.ambient.setFieldValue(wrappedSource, "")`.
 */

import type { Validator } from "@chelone/core";
import { computed } from "vue";
import { useCheloneFormContext, useWrappedSource } from "../../../form/form-context";
import { subscribeStore, useSubscribable } from "../../../form/subscribe-ref";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import TextInput from "./text-input.vue";

const props = withDefaults(
  defineProps<ResettableTextInputProps>(),
  { resettable: true, clearAlwaysVisible: false, label: undefined },
);

const translate = useTranslate();
const { form } = useCheloneFormContext();
const wrappedSource = useWrappedSource(props.source);

// Observe the ambient form store so `hasValue` re-derives per keystroke. Reading
// `form.ambient.getFieldValue` inside a computed is only reactive if the computed also
// depends on the store snapshot, hence the `void formState.value` touch.
const formState = useSubscribable({
  getSnapshot: () => form.ambient.store.state,
  subscribe: (cb) => subscribeStore(form.ambient.store, cb),
});
const hasValue = computed(() => {
  void formState.value;
  const v = form.ambient.getFieldValue(wrappedSource);
  return v != null && v !== "";
});

const showClearButton = computed(
  () => props.resettable && (props.clearAlwaysVisible || hasValue.value),
);
const clearLabel = computed(() =>
  translate("chelone.action.clear_input_value", { _: "Clear value" }),
);

function handleClear() {
  form.ambient.setFieldValue(wrappedSource, "");
}
</script>

<template>
  <TextInput
    :source="source"
    :label="label"
    :default-value="defaultValue"
    :validate="validate"
    :helper-text="helperText"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :class="props.class"
    :input-class="cn(resettable ? 'pr-9' : undefined, inputClass)"
  >
    <template v-if="showClearButton" #controlSuffix>
      <Button
        data-slot="reset"
        type="button"
        variant="ghost"
        size="icon"
        class="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-muted-foreground"
        :disabled="disabled || readonly || !hasValue"
        :aria-label="clearLabel"
        :title="clearLabel"
        :tabindex="-1"
        @click="handleClear"
      >
        <svg
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
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </Button>
    </template>
  </TextInput>
</template>
