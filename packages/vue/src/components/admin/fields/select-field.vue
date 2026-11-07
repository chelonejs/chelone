<script
  lang="ts"
  generic="TChoice extends ChoiceRecord = ChoiceRecord, RecordType extends ResourceRecord = LooseRecord"
>
import type { LooseRecord, ResourceRecord, SourcePath, SourceProp, SourceValue } from "@chelone/core";
import type { ChoiceRecord, OptionText } from "../../../choices/use-choices";

/** Props for {@link SelectField}. */
export interface SelectFieldProps<
  TChoice extends ChoiceRecord = ChoiceRecord,
  RecordType extends ResourceRecord = LooseRecord,
> {
  source: SourceProp<RecordType>;
  record?: RecordType;
  defaultValue?: SourceValue<RecordType, SourceProp<RecordType>>;
  empty?: string;
  /** The list of choices to map the value against. */
  choices?: readonly TChoice[];
  /** The value path on a choice. Default `'id'`. */
  optionValue?: SourcePath<TChoice>;
  /** The display path or a formatter. Default `'name'`. */
  optionText?: OptionText<TChoice>;
  /** Translate a string-path text through the catalog. Default `true`. */
  translateChoice?: boolean;
  class?: string;
}
</script>

<script
  setup
  lang="ts"
  generic="TChoice extends ChoiceRecord = ChoiceRecord, RecordType extends ResourceRecord = LooseRecord"
>
/**
 * `<SelectField>` — displays an enumeration value by mapping it to a
 * human-readable label, the Vue port of `@chelone/react`'s
 * `fields/select-field.tsx`. Reads the value at `source`, finds the matching
 * `choice` (by `optionValue`), and renders its `optionText` (translated by
 * default). No matching choice renders the (translated) `empty` string, or
 * nothing.
 */

import { computed } from "vue";
import { useChoices } from "../../../choices/use-choices";
import { useFieldValue } from "../../../record/use-field-value";
import { useTranslate } from "../../../i18n/use-translate";

const props = defineProps<SelectFieldProps<TChoice, RecordType>>();

const value = useFieldValue<RecordType>({
  source: props.source,
  record: props.record,
  defaultValue: props.defaultValue,
});

const { getChoiceText, getChoiceValue } = useChoices({
  optionText: props.optionText,
  optionValue: props.optionValue,
  translateChoice: props.translateChoice ?? true,
});
const translate = useTranslate();

const choice = computed(() =>
  props.choices
    ? props.choices.find((c) => getChoiceValue(c) === value.value)
    : undefined,
);

const choiceText = computed(() =>
  choice.value ? getChoiceText(choice.value) : null,
);

const emptyText = computed(() =>
  props.empty ? translate(props.empty, { _: props.empty }) : null,
);
</script>

<template>
  <span v-if="choiceText != null" :class="props.class" data-slot="select-field">{{
    choiceText
  }}</span>
  <span
    v-else-if="emptyText != null"
    :class="props.class"
    data-slot="select-field"
    >{{ emptyText }}</span
  >
</template>
