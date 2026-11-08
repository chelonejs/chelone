<script lang="ts" generic="TRecord = LooseRecord, TPath extends SourceProp<TRecord> = SourceProp<TRecord>, TChoice extends ChoiceRecord = ChoiceRecord">
import type { LooseRecord, SourceProp } from "@chelone/core";
import type { ChoiceRecord } from "../../../choices/use-choices";
import type { ChoiceInputBaseProps } from "./choice-input-props";

/**
 * Props for {@link DatagridInput}.
 *
 * `disableValue` comes in through the shared base and is unused: a datagrid row
 * is never disabled. The React twin has no `disableValue` prop at all.
 */
export interface DatagridInputProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends ChoiceInputBaseProps<TRecord, TPath, TChoice> {
  /** Column header for the choice column. Default empty. */
  optionLabel?: string;
}
</script>

<script setup lang="ts" generic="TRecord = LooseRecord, TPath extends SourceProp<TRecord> = SourceProp<TRecord>, TChoice extends ChoiceRecord = ChoiceRecord">
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

import type { Identifier, SourcePath } from "@chelone/core";
import { isIdentifier, toIdentifierList } from "@chelone/core";
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

const props = defineProps<
  DatagridInputProps<TRecord, TPath, TChoice>
>();

const translate = useTranslate();

const { source, allChoices, getChoiceText, getChoiceValue } = useChoiceInput({
  componentName: "DatagridInput",
  choices: props.choices,
  source: props.source,
  // The React twin defaults `optionText` to `"name"` in its own destructuring,
  // so a `<DatagridInput>` under a reference wrapper labels the `name` field
  // rather than the record representation. The literal has to be cast: a
  // `SourcePath<TChoice>` is deferred while `TChoice` is open.
  optionText: props.optionText ?? ("name" as SourcePath<TChoice>),
  optionValue: props.optionValue,
  disableValue: props.disableValue,
  translateChoice: props.translateChoice,
});

const { id, value, setValue, blur, error, touched } = useInput({
  source,
  defaultValue: props.defaultValue,
  validate: props.validate,
  format: toIdentifierList,
});

const invalid = computed(() => touched.value && error.value != null);
const selectedIds = computed(() => toIdentifierList(value.value));
// A choice whose value is not an id has no row to tick, so it is skipped.
const rows = computed(() =>
  allChoices.value.flatMap((choice) => {
    const rowId = getChoiceValue(choice);
    return isIdentifier(rowId) ? [{ choice, rowId }] : [];
  }),
);
const allIds = computed(() => rows.value.map((row) => row.rowId));
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
              :aria-label="translate('chelone.action.select_all', { _: 'Select all' })"
              :aria-invalid="invalid || undefined"
              @update:model-value="toggleAll"
            />
          </TableHead>
          <TableHead>{{ optionLabel }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow
          v-for="{ choice, rowId } in rows"
          :key="String(rowId)"
          :data-state="isSelected(rowId) ? 'selected' : undefined"
        >
          <TableCell>
            <Checkbox
              :id="`${id}-${String(rowId)}`"
              :model-value="isSelected(rowId)"
              :aria-label="translate('chelone.action.select_row', { _: 'Select this row' })"
              @update:model-value="toggle(rowId)"
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
