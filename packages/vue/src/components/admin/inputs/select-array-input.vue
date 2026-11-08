<script lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { ChoiceRecord } from "../../../choices/use-choices";
import type { ChoiceInputBaseProps } from "./choice-input-props";

/** Props for {@link SelectArrayInput}. */
export interface SelectArrayInputProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends ChoiceInputBaseProps<TRecord, TPath, TChoice> {
  /** Placeholder shown in the trigger when nothing is selected. */
  placeholder?: string;
}
</script>

<script setup lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
/**
 * `<SelectArrayInput>` — a compact multi-select: a trigger showing the selected
 * items as badges that opens a checkbox list. The Vue analog of
 * `@chelone/react`'s `inputs/select-array-input.tsx` (reka-ui Popover + checkbox
 * list, adapted here to a native disclosure — a `<button>` toggling a
 * conditionally-rendered listbox, the dependency-free `ui/` idiom, mirroring how
 * `text-array-input.vue` deferred the Popover). Unlike `<CheckboxGroupInput>` the
 * options are hidden until opened; unlike `<AutocompleteArrayInput>` it is not
 * searchable.
 *
 * Binds the whole id array through one {@link useInput} field (`format` coalesces
 * a nullish value to `[]`); toggling a checkbox adds/removes its choice value
 * (string-compared, twin parity) and re-writes the array.
 */

import { type ChoiceValueOf, toChoiceValues } from "@chelone/core";
import { computed, ref } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import Checkbox from "../../ui/checkbox.vue";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";
import { useChoiceInput } from "./use-choice-input";

const props = withDefaults(defineProps<SelectArrayInputProps<LooseRecord, SourceProp, TChoice>>(), {
  label: undefined,
});

const translate = useTranslate();
const open = ref(false);

const {
  source,
  allChoices,
  fetchError,
  getChoiceText,
  getChoiceValue,
  getDisableValue,
} = useChoiceInput({
  componentName: "SelectArrayInput",
  choices: props.choices,
  source: props.source,
  optionText: props.optionText,
  optionValue: props.optionValue,
  disableValue: props.disableValue,
  translateChoice: props.translateChoice,
});

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source,
  defaultValue: props.defaultValue,
  validate: props.validate,
});

const invalid = computed(() => touched.value && error.value != null);
const values = computed(() => toChoiceValues<TChoice>(value.value));
const selectedChoices = computed(() =>
  allChoices.value.filter((choice) =>
    values.value.some((v) => String(v) === String(getChoiceValue(choice))),
  ),
);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(source)),
);
const helper = computed(
  () => props.helperText ?? fetchError.value?.message,
);

function isChecked(choiceValue: ChoiceValueOf<TChoice>): boolean {
  return values.value.some((v) => String(v) === String(choiceValue));
}

function isChoiceDisabled(choice: TChoice): boolean {
  return (
    props.disabled === true ||
    props.readonly === true ||
    getDisableValue(choice) === true
  );
}

function onToggle(choiceValue: ChoiceValueOf<TChoice>, checked: boolean) {
  const next = checked
    ? [...values.value, choiceValue]
    : values.value.filter((v) => String(v) !== String(choiceValue));
  setValue(next);
  blur();
}

function onClear() {
  setValue([]);
  blur();
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid" data-slot="select-array">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div class="relative">
        <button
          :id="id"
          type="button"
          role="combobox"
          :aria-expanded="open"
          :aria-invalid="invalid || undefined"
          :disabled="disabled || readonly"
          class="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
          @click="open = !open"
        >
          <span class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            <span v-if="selectedChoices.length === 0" class="text-muted-foreground">
              {{ placeholder ?? " " }}
            </span>
            <span
              v-for="choice in selectedChoices"
              :key="String(getChoiceValue(choice))"
              class="inline-flex items-center rounded border border-input px-2 py-0.5 text-xs font-normal"
            >
              {{ getChoiceText(choice) }}
            </span>
          </span>
          <span class="flex shrink-0 items-center gap-1">
            <span
              v-if="selectedChoices.length > 0 && !disabled && !readonly"
              role="button"
              tabindex="0"
              class="cursor-pointer text-muted-foreground opacity-50 hover:opacity-100"
              :aria-label="translate('chelone.action.clear_input_value', { _: 'Clear value' })"
              @click.stop="onClear"
              @keydown.enter.prevent="onClear"
              @keydown.space.prevent="onClear"
            >×</span>
            <span aria-hidden="true" class="opacity-50">▾</span>
          </span>
        </button>
        <div
          v-if="open"
          role="listbox"
          aria-multiselectable="true"
          class="absolute z-10 mt-1 flex max-h-64 w-full flex-col overflow-auto rounded-md border border-input bg-background py-1 shadow-md"
        >
          <p
            v-if="allChoices.length === 0"
            class="px-3 py-2 text-sm text-muted-foreground"
          >
            {{ translate("chelone.navigation.no_results", { _: "No results" }) }}
          </p>
          <label
            v-for="choice in allChoices"
            :key="String(getChoiceValue(choice))"
            :for="`${id}-${String(getChoiceValue(choice))}`"
            :class="[
              'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent',
              isChoiceDisabled(choice) && 'cursor-not-allowed opacity-50',
            ]"
          >
            <Checkbox
              :id="`${id}-${String(getChoiceValue(choice))}`"
              :model-value="isChecked(getChoiceValue(choice))"
              :disabled="isChoiceDisabled(choice)"
              @update:model-value="
                (checked: boolean) => onToggle(getChoiceValue(choice), checked)
              "
            />
            <span class="flex-1">{{ getChoiceText(choice) }}</span>
          </label>
        </div>
      </div>
    <FieldDescription v-if="helper">{{ helper }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
