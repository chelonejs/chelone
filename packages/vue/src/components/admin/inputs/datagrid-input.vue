<script lang="ts">
import type { ChoiceInputBaseProps } from "./choice-input-props";

/** Props for {@link DatagridInput}. */
export interface DatagridInputProps extends ChoiceInputBaseProps {
  /** Column header for the choice column. Default empty. */
  optionLabel?: string;
}
</script>

<script setup lang="ts">
/**
 * `<DatagridInput>` — renders the choices as a selectable table: the user ticks
 * row checkboxes and the form value is the array of selected record ids. The Vue
 * analog of `@chelone/react`'s `inputs/datagrid-input.tsx`.
 *
 * Typically a child of `<ReferenceArrayInput>` (choices + resource come from the
 * ambient choices context via {@link useChoiceInput}); can also take an inline
 * `choices` prop. The selection lives on the form value — a single
 * {@link useInput} id-array binding — so no list-selection store / DataTable
 * controller is needed. A header checkbox toggles select-all.
 *
 * @experimental A simplified port: row selection + select-all only (no
 * filtering / pagination / create-suggestion flow), matching the React twin.
 */

import type { Identifier } from "@chelone/core";
import { computed } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import Checkbox from "../../ui/checkbox.vue";
import { FieldDescription, FieldError } from "../../ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import ValidationError from "../common/validation-error.vue";
import { useChoiceInput } from "./use-choice-input";

const props = withDefaults(defineProps<DatagridInputProps>(), {
  optionValue: "id",
});

const translate = useTranslate();
const emptyArray: Identifier[] = [];

const { source, allChoices, getChoiceText, getChoiceValue } = useChoiceInput({
  componentName: "DatagridInput",
  choices: props.choices,
  source: props.source,
  optionText: props.optionText ?? "name",
  optionValue: props.optionValue,
  disableValue: props.disableValue,
  translateChoice: props.translateChoice,
});

const { id, value, setValue, blur, error, touched } = useInput({
  source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  format: (raw: unknown) => (Array.isArray(raw) ? raw : emptyArray),
});

const invalid = computed(() => touched.value && error.value != null);
const selectedIds = computed<Identifier[]>(() =>
  Array.isArray(value.value) ? (value.value as Identifier[]) : emptyArray,
);
const allIds = computed<Identifier[]>(() =>
  allChoices.value.map((choice) => getChoiceValue(choice) as Identifier),
);
const allSelected = computed(
  () =>
    allIds.value.length > 0 &&
    allIds.value.every((rowId) => isSelected(rowId)),
);
const helper = computed(() => props.helperText);

function isSelected(rowId: Identifier): boolean {
  return selectedIds.value.some((v) => String(v) === String(rowId));
}

function toggle(rowId: Identifier) {
  setValue(
    isSelected(rowId)
      ? selectedIds.value.filter((v) => String(v) !== String(rowId))
      : [...selectedIds.value, rowId],
  );
  blur();
}

function toggleAll() {
  setValue(allSelected.value ? [] : allIds.value);
  blur();
}
</script>

<template>
  <div :class="props.class" data-slot="datagrid-input">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-10">
            <Checkbox
              :model-value="allSelected"
              :aria-label="translate('ra.action.select_all', { _: 'Select all' })"
              :aria-invalid="invalid || undefined"
              @update:model-value="toggleAll"
            />
          </TableHead>
          <TableHead>{{ optionLabel }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="choice in allChoices"
          :key="String(getChoiceValue(choice))"
          :data-state="
            isSelected(getChoiceValue(choice) as Identifier) ? 'selected' : undefined
          "
        >
          <TableCell>
            <Checkbox
              :id="`${id}-${String(getChoiceValue(choice))}`"
              :model-value="isSelected(getChoiceValue(choice) as Identifier)"
              :aria-label="translate('ra.action.select_row', { _: 'Select this row' })"
              @update:model-value="toggle(getChoiceValue(choice) as Identifier)"
            />
          </TableCell>
          <TableCell>{{ getChoiceText(choice) }}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <FieldDescription v-if="helper">{{ helper }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </div>
</template>
