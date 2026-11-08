<script
  lang="ts"
  generic="
    RecordType = LooseRecord,
    TPath extends SourceProp<RecordType> = SourceProp<RecordType>
  "
>
import type {
  ArrayItemOf,
  ItemDefaultsOf,
  LooseRecord,
  SourceProp,
  Validator,
} from "@chelone/core";

/** Props for {@link ArrayInput}. */
export interface ArrayInputProps<
  RecordType = LooseRecord,
  TPath extends SourceProp<RecordType> = SourceProp<RecordType>,
> {
  /** The array field path RELATIVE to the ambient source scope. */
  source: TPath;
  /** Explicit label, or `false` to hide it. Absent → humanized `source`. */
  label?: string | false;
  /** Override the ambient resource (label-key resolution). */
  resource?: string;
  /** Helper text rendered below the iterator. */
  helperText?: string;
  /** Array-level validators (e.g. `minLength`) — composed, first error wins. */
  validate?: Validator | readonly Validator[];
  /** The array's default value (seeds an untouched hole). */
  defaultValue?: readonly ArrayItemOf<RecordType, TPath>[];
  /** Force scalar-row mode (a `string[]`/`number[]`); DETECTED when omitted. */
  scalar?: boolean;
  /** Object-row defaults merged into a new row (object mode). */
  itemDefaults?: ItemDefaultsOf<ArrayItemOf<RecordType, TPath>>;
  /** Label for the add-row button. Absent → translated "Add". */
  addLabel?: string;
  /** Hides every row control: add, clear, remove and reorder. */
  disabled?: boolean;
  /** Hides the Add button. */
  disableAdd?: boolean;
  /** Hides the clear button. */
  disableClear?: boolean;
  /**
   * Hides the remove buttons, and the clear button with them. A function
   * decides per row index.
   */
  disableRemove?: boolean | ((index: number) => boolean);
  /** Hides the move up / move down buttons. */
  disableReordering?: boolean;
  /** Lays a row's inputs out in one line from the `sm` breakpoint up. */
  inline?: boolean;
  /**
   * A label per row. `true` numbers rows from 1; a function returns the label
   * for a row index; `false` renders none.
   */
  getItemLabel?: boolean | ((index: number) => string);
  /** Root element class passthrough. */
  class?: string;
}
</script>

<script
  setup
  lang="ts"
  generic="
    RecordType = LooseRecord,
    TPath extends SourceProp<RecordType> = SourceProp<RecordType>
  "
>
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
 * remove/reorder controls. An "Add" button appends a row, and a clear button
 * empties the array after a `<Confirm>`.
 *
 * Scoped slots replace the defaults: `#add-button` gets `{ add }`, and
 * `#remove-button` and `#reorder-buttons` get `{ index, remove, reOrder }` per
 * row, where `reOrder(to)` moves that row to the index `to`.
 */

import { computed, ref } from "vue";
import { provideArrayInput, useArrayInput } from "../../../array";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";
import { FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import Confirm from "../feedback/confirm.vue";
import ValidationError from "../common/validation-error.vue";
import ArrayInputRow from "./array-input-row.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(defineProps<ArrayInputProps<RecordType, TPath>>(), {
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

const { rows, total, fieldState } = array;
const invalid = fieldState.invalid;
const error = fieldState.error;
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);
const addLabelText = computed(
  () => props.addLabel ?? translate("chelone.action.add", { _: "Add" }),
);

const clearLabel = computed(() =>
  translate("chelone.action.clear_array_input", { _: "Clear the array" }),
);
const clearMessage = computed(() =>
  translate("chelone.message.clear_array_input", {
    _: "Are you sure you want to clear the whole array?",
  }),
);
const confirmOpen = ref(false);
const showClear = computed(
  () =>
    !props.disabled &&
    total.value > 0 &&
    !props.disableClear &&
    !props.disableRemove,
);
const showActions = computed(
  () => !props.disabled && (!props.disableAdd || showClear.value),
);

function onAdd() {
  array.add();
}
function onClear() {
  array.clear();
  confirmOpen.value = false;
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
      <ArrayInputRow
        v-for="row in rows"
        :key="row.id"
        :row="row"
        :disabled="disabled"
        :disable-remove="disableRemove"
        :disable-reordering="disableReordering"
        :inline="inline"
        :get-item-label="getItemLabel"
      >
        <slot />
        <template v-if="$slots['remove-button']" #remove-button="slotProps">
          <slot name="remove-button" v-bind="slotProps" />
        </template>
        <template v-if="$slots['reorder-buttons']" #reorder-buttons="slotProps">
          <slot name="reorder-buttons" v-bind="slotProps" />
        </template>
      </ArrayInputRow>
    </div>
    <div v-if="showActions" class="flex items-center gap-2">
      <slot v-if="!disableAdd" name="add-button" :add="onAdd">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="array-input-add"
          @click="onAdd"
        >
          {{ addLabelText }}
        </Button>
      </slot>
      <template v-if="showClear">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-slot="array-input-clear"
          @click="confirmOpen = true"
        >
          {{ clearLabel }}
        </Button>
        <Confirm
          :is-open="confirmOpen"
          :title="clearLabel"
          :content="clearMessage"
          @close="confirmOpen = false"
          @confirm="onClear"
        />
      </template>
    </div>
    <FieldDescription v-if="helperText">{{ helperText }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </div>
</template>
