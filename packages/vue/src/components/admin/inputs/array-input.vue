<script lang="ts">
import type { Validator } from "@chelone/core";

/** Props for {@link ArrayInput}. */
export interface ArrayInputProps {
  /** The array field path RELATIVE to the ambient source scope. */
  source: string;
  /** Explicit label, or `false` to hide it. Absent → humanized `source`. */
  label?: string | false;
  /** Override the ambient resource (label-key resolution). */
  resource?: string;
  /** Helper text rendered below the iterator. */
  helperText?: string;
  /** Array-level validators (e.g. `minLength`) — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /** The array's default value (seeds an untouched hole). */
  defaultValue?: readonly unknown[];
  /** Force scalar-row mode (a `string[]`/`number[]`); DETECTED when omitted. */
  scalar?: boolean;
  /** Object-row defaults merged into a new row (object mode). */
  itemDefaults?: Record<string, unknown>;
  /** Label for the add-row button. Absent → translated "Add". */
  addLabel?: string;
  /** Root element class passthrough. */
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ArrayInput>` — a list of sub-forms for editing an array embedded in a record
 * (order items, tags, any repeatable data), the Vue analog of `@chelone/react`'s
 * `inputs/array-input.tsx`. It owns the SINGLE {@link useArrayInput} binding for
 * the field, renders the label/error chrome, scopes children under the array
 * path via {@link provideArrayInput}, and renders one {@link ArrayInputRow} per
 * row (keyed by the row's stable id) carrying the default slot — the nested
 * input template repeated per row.
 *
 * chelone-native structure: rather than delegating to a separate
 * `<SimpleFormIterator>` child (React's split), the iterator is folded in here
 * and each row is an `<ArrayInputRow>` that scopes its slot + renders
 * remove/reorder controls. An "Add" button appends a row.
 */

import { computed } from "vue";
import { provideArrayInput, useArrayInput } from "../../../array";
import { useTranslate } from "../../../i18n/use-translate";
import { Button } from "../../ui";
import { FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import ArrayInputRow from "./array-input-row.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<ArrayInputProps>(), {
  label: undefined,
  defaultValue: () => [],
});

const translate = useTranslate();

const array = useArrayInput({
  source: props.source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  scalar: props.scalar,
  itemDefaults: props.itemDefaults,
});

// Provide the iterator + array source scope to the rows below.
provideArrayInput(array);

const { rows, fieldState } = array;
const invalid = fieldState.invalid;
const error = fieldState.error;
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);
const addLabelText = computed(
  () => props.addLabel ?? translate("ra.action.add", { _: "Add" }),
);

function onAdd() {
  array.add();
}
</script>

<template>
  <div
    :class="props.class"
    :data-invalid="invalid || undefined"
    data-slot="array-input"
    class="flex w-full flex-col gap-2"
  >
    <FieldLabel v-if="labelText != null" class="text-muted-foreground text-sm">
      {{ labelText }}
    </FieldLabel>
    <div data-slot="array-input-rows" class="flex flex-col gap-3">
      <ArrayInputRow v-for="row in rows" :key="row.id" :row="row">
        <slot />
      </ArrayInputRow>
    </div>
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-slot="array-input-add"
        @click="onAdd"
      >
        {{ addLabelText }}
      </Button>
    </div>
    <FieldDescription v-if="helperText">{{ helperText }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </div>
</template>
