<script
  lang="ts"
  generic="
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
import type { RegisteredResources, ResourceMap } from "@chelone/core";

/** Props for {@link ReferenceInput}. */
export interface ReferenceInputProps<
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string
> {
  source: SourceProp;
  /** A registered resource name. */
  reference: TReference;
  label?: string | false;
  perPage?: number;
  validate?: Validator | readonly Validator[];
  class?: string;
}
</script>

<script
  setup
  lang="ts"
  generic="
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
/**
 * `<ReferenceInput>` — edits a to-one foreign key, the Vue analog of
 * `@chelone/react`'s `inputs/reference-input.tsx`. The React twin drives a full
 * `useReferenceInput` choices controller + `<AutocompleteInput>`; the V1 Vue
 * slice ports the ONE reference path minimally: fetch the reference resource's
 * choices with `useGetList` (vue-query) and bind the FK via `useInput` over a
 * native `<select>` (the reka-ui combobox autocomplete is a later wave — spec
 * Risk 1). Choice labels use the reference's record representation.
 */

import {
  DEFAULT_REFERENCE_PER_PAGE,
  type SourceProp,
  type Validator,
} from "@chelone/core";
import { computed } from "vue";
import { useGetList } from "../../../data/queries";
import { useInput } from "../../../form/use-input";
import { useGetRecordRepresentation } from "../../../label/use-get-record-representation";
import { Field, FieldError, FieldLabel } from "../../ui/field";
import NativeSelect from "../../ui/native-select.vue";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";

const props = withDefaults(
  defineProps<ReferenceInputProps<TResources, TReference>>(),
  {
    label: undefined,
  },
);

const { id, value, setValue, error, touched, isRequired } = useInput({
  source: props.source,
  validate: props.validate,
});

// The input's `TReference` is its own open type parameter, so the read takes the
// composable's loose arm.
const name: string = props.reference;

const query = useGetList(name, () => ({
  pagination: { page: 1, perPage: props.perPage ?? DEFAULT_REFERENCE_PER_PAGE },
}));
const getRepresentation = useGetRecordRepresentation(props.reference);

interface Choice {
  value: string | number;
  label: string;
}

const choices = computed<Choice[]>(() => {
  const rows = query.data.value?.data ?? [];
  return rows.map((record) => ({
    value: record.id,
    label: getRepresentation(record),
  }));
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(props.source)),
);

// Preserve the choice value's original type (number ids stay numbers) by
// matching the selected string back to its choice.
function onSelect(raw: string) {
  const match = choices.value.find((choice) => String(choice.value) === raw);
  setValue(match ? match.value : raw);
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <NativeSelect
      :id="id"
      :model-value="value as string | number | null"
      :options="choices"
      :aria-invalid="invalid"
      @update:model-value="onSelect"
    />
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
