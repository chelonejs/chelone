<script lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
import type {
  FilterPayload,
  LooseRecord,
  SourceProp,
} from "@chelone/core";
import type { ChoiceRecord } from "../../../choices/use-choices";
import type { ChoiceInputBaseProps } from "./choice-input-props";

/** Props for {@link AutocompleteArrayInput}. */
export interface AutocompleteArrayInputProps<
  TRecord = LooseRecord,
  TPath extends SourceProp<TRecord> = SourceProp<TRecord>,
  TChoice extends ChoiceRecord = ChoiceRecord,
> extends ChoiceInputBaseProps<TRecord, TPath, TChoice> {
  /** Placeholder shown in the search input. */
  placeholder?: string;
  /** Maps the typed filter text into a reference-list filter payload. Default `{ q }`. */
  filterToQuery?: (searchText: string) => FilterPayload;
  /** Content shown when no choice matches the filter. */
  noOptionsText?: string;
}
</script>

<script setup lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
/**
 * `<AutocompleteArrayInput>` — a searchable multi-select showing chosen items as
 * removable badges, the Vue analog of `@chelone/react`'s
 * `inputs/autocomplete-array-input.tsx`. Reads choices via {@link useChoiceInput}
 * and binds the whole id array through one {@link useInput} field (`format`
 * coalesces nullish → `[]`). The reka-ui Combobox (Popover + cmdk) is adapted to
 * the dependency-free `ui/` idiom: badges + a native `<input>` over a
 * conditionally-rendered `role="listbox"` of the UNSELECTED choices.
 *
 * Filtering mirrors {@link AutocompleteInput}: inline → client-side substring on
 * the display text; reference → `setFilters(filterToQuery(text))` server-side.
 * Selecting appends the choice value; a badge's × (or Backspace on an empty
 * input) removes one (twin parity).
 */

import { toChoiceValues } from "@chelone/core";
import { computed, ref } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import { areIdsEqual } from "../../../lib/are-ids-equal";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { targetOf } from "./event-target";
import { humanizeSource } from "./label-text";
import { useChoiceInput } from "./use-choice-input";

const props = withDefaults(defineProps<AutocompleteArrayInputProps<LooseRecord, SourceProp, TChoice>>(), {
  label: undefined,
  filterToQuery: (searchText: string) => ({ q: searchText }),
});

const translate = useTranslate();

const {
  source,
  isFromReference,
  allChoices,
  fetchError,
  getChoiceText,
  getChoiceValue,
  setFilters,
} = useChoiceInput({
  componentName: "AutocompleteArrayInput",
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

const open = ref(false);
const query = ref("");

const values = computed(() => toChoiceValues<TChoice>(value.value));
const selectedChoices = computed(() =>
  allChoices.value.filter((choice) =>
    values.value.some((v) => areIdsEqual(getChoiceValue(choice), v)),
  ),
);
const unselectedChoices = computed(() =>
  allChoices.value.filter(
    (choice) => !values.value.some((v) => areIdsEqual(getChoiceValue(choice), v)),
  ),
);
const filteredChoices = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (isFromReference || q === "") return unselectedChoices.value;
  return unselectedChoices.value.filter((choice) =>
    getChoiceText(choice).toLowerCase().includes(q),
  );
});

const invalid = computed(() => touched.value && error.value != null);
const labelText = computed(() =>
  props.label === false ? null : (props.label ?? humanizeSource(source)),
);
const placeholderText = computed(
  () => props.placeholder ?? translate("chelone.action.search", { _: "Search..." }),
);
const noMatchText = computed(
  () =>
    props.noOptionsText ??
    translate("chelone.navigation.no_results", { _: "No matching item found." }),
);
const helper = computed(
  () => props.helperText ?? fetchError.value?.message,
);

function onFocus() {
  open.value = true;
}

function onInput(event: Event) {
  const input = targetOf(event, HTMLInputElement);
  if (!input) return;
  const text = input.value;
  query.value = text;
  open.value = true;
  if (isFromReference) setFilters(props.filterToQuery(text), true);
}

function onSelect(choice: TChoice) {
  setValue([...values.value, getChoiceValue(choice)]);
  query.value = "";
  if (isFromReference) setFilters(props.filterToQuery(""), true);
  blur();
}

function onUnselect(choice: TChoice) {
  setValue(values.value.filter((v) => !areIdsEqual(getChoiceValue(choice), v)));
  blur();
}

function onKeyDown(event: KeyboardEvent) {
  if (
    (event.key === "Backspace" || event.key === "Delete") &&
    query.value === "" &&
    values.value.length > 0
  ) {
    setValue(values.value.slice(0, -1));
  } else if (event.key === "Escape") {
    open.value = false;
  }
}

function onBlur() {
  window.setTimeout(() => {
    open.value = false;
    query.value = "";
    blur();
  }, 120);
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid" data-slot="autocomplete-array">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div class="relative">
      <div
        class="flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring aria-invalid:border-destructive"
        :aria-invalid="invalid || undefined"
      >
        <span
          v-for="choice in selectedChoices"
          :key="String(getChoiceValue(choice))"
          class="inline-flex items-center gap-1 rounded border border-input px-2 py-0.5 text-xs font-normal"
        >
          {{ getChoiceText(choice) }}
          <button
            type="button"
            class="cursor-pointer rounded-full outline-none focus:ring-2 focus:ring-ring"
            :disabled="disabled || readonly"
            :aria-label="translate('chelone.action.remove', { _: 'Remove' })"
            @mousedown.prevent.stop
            @click.prevent="onUnselect(choice)"
          >×</button>
        </span>
        <input
          :id="id"
          type="text"
          role="combobox"
          :aria-expanded="open"
          :aria-invalid="invalid || undefined"
          :value="query"
          :placeholder="placeholderText"
          :disabled="disabled || readonly"
          autocomplete="off"
          class="ml-1 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          @focus="onFocus"
          @input="onInput"
          @keydown="onKeyDown"
          @blur="onBlur"
        />
      </div>
      <ul
        v-if="open"
        role="listbox"
        aria-multiselectable="true"
        class="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-input bg-background py-1 shadow-md"
      >
        <li
          v-if="filteredChoices.length === 0"
          class="px-3 py-2 text-sm text-muted-foreground"
        >
          {{ noMatchText }}
        </li>
        <li
          v-for="choice in filteredChoices"
          :key="String(getChoiceValue(choice))"
          role="option"
          class="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent"
          @mousedown.prevent="onSelect(choice)"
        >
          {{ getChoiceText(choice) }}
        </li>
      </ul>
    </div>
    <FieldDescription v-if="helper">{{ helper }}</FieldDescription>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
