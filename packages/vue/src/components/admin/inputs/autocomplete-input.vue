<script lang="ts" generic="TChoice extends ChoiceRecord = ChoiceRecord">
import type {
  FilterPayload,
  LooseRecord,
  SourceProp,
} from "@chelone/core";
import type { ChoiceRecord } from "../../../choices/use-choices";
import type { ChoiceInputBaseProps } from "./choice-input-props";

/** Props for {@link AutocompleteInput}. */
export interface AutocompleteInputProps<
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
 * `<AutocompleteInput>` — a searchable dropdown for choosing a single scalar, the
 * Vue analog of `@chelone/react`'s `inputs/autocomplete-input.tsx`. Reads choices
 * via {@link useChoiceInput} and binds the scalar with {@link useInput}. The
 * reka-ui Combobox (Popover + cmdk) is adapted to the dependency-free `ui/` idiom:
 * a native `role="combobox"` `<input>` over a conditionally-rendered
 * `role="listbox"`.
 *
 * Filtering: for an INLINE context the choices are filtered CLIENT-side by their
 * display text (case-insensitive substring); for a REFERENCE context the filter
 * is pushed to the controller via `setFilters(filterToQuery(text))` (server-side)
 * and the returned list is shown verbatim. Selecting a choice submits its
 * ORIGINAL value; re-selecting the current value clears it when not required
 * (twin parity).
 */

import { computed, ref, watch } from "vue";
import { useInput } from "../../../form/use-input";
import { useTranslate } from "../../../i18n/use-translate";
import { areIdsEqual } from "../../../lib/are-ids-equal";
import { Field, FieldDescription, FieldError, FieldLabel } from "../../ui/field";
import ValidationError from "../common/validation-error.vue";
import { humanizeSource } from "./label-text";
import { useChoiceInput } from "./use-choice-input";

const props = withDefaults(defineProps<AutocompleteInputProps<LooseRecord, SourceProp, TChoice>>(), {
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
  componentName: "AutocompleteInput",
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

const selectedChoice = computed(() =>
  allChoices.value.find((choice) =>
    areIdsEqual(getChoiceValue(choice), value.value),
  ),
);
const selectedText = computed(() =>
  selectedChoice.value ? getChoiceText(selectedChoice.value) : "",
);

// Reflect the selection into the input when closed (a real autocomplete shows
// the chosen label); typing then filters. Runs on external value changes too.
watch(
  selectedText,
  (text) => {
    if (!open.value) query.value = text;
  },
  { immediate: true },
);

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

const filteredChoices = computed(() => {
  const q = query.value.trim().toLowerCase();
  // A reference context filters server-side; show its list verbatim. An inline
  // context filters client-side, but an untouched query (still showing the
  // selected label) lists everything so re-opening reveals the full set.
  if (isFromReference || q === "" || q === selectedText.value.toLowerCase()) {
    return allChoices.value;
  }
  return allChoices.value.filter((choice) =>
    getChoiceText(choice).toLowerCase().includes(q),
  );
});

function onFocus() {
  open.value = true;
}

function onInput(event: Event) {
  const text = (event.target as HTMLInputElement).value;
  query.value = text;
  open.value = true;
  if (isFromReference) setFilters(props.filterToQuery(text));
}

function onSelect(choice: TChoice) {
  if (areIdsEqual(getChoiceValue(choice), value.value) && !isRequired) {
    setValue("");
    query.value = "";
  } else {
    setValue(getChoiceValue(choice));
    query.value = getChoiceText(choice);
  }
  open.value = false;
  if (isFromReference) setFilters(props.filterToQuery(""));
  blur();
}

function onBlur() {
  // Defer so a mousedown on an option selects before the list unmounts.
  window.setTimeout(() => {
    open.value = false;
    query.value = selectedText.value;
    blur();
  }, 120);
}
</script>

<template>
  <Field :class="props.class" :data-invalid="invalid" data-slot="autocomplete">
    <FieldLabel v-if="labelText != null" :html-for="id">
      {{ labelText }}<span v-if="isRequired"> *</span>
    </FieldLabel>
    <div class="relative">
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
        class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"
        @focus="onFocus"
        @input="onInput"
        @blur="onBlur"
      />
      <ul
        v-if="open"
        role="listbox"
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
          :aria-selected="areIdsEqual(value, getChoiceValue(choice))"
          class="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent aria-selected:bg-accent"
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
