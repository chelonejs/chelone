<script lang="ts">
import type { GeocodingProvider, LngLatBox, SourceProp } from "@chelone/core";

/** Props for {@link GeocodingInput}. */
export interface GeocodingInputProps {
  /** The form field holding the address text. */
  source: SourceProp;
  /** Written with the picked result's latitude. Left alone when unset. */
  latSource?: SourceProp;
  /** Written with the picked result's longitude. Left alone when unset. */
  lngSource?: SourceProp;
  /** Written with the picked result's `[west, south, east, north]`, when it has one. */
  bboxSource?: SourceProp;
  /** A string is translated; `false` renders none. Defaults to the label of `source`. */
  label?: string | false;
  /** Defaults to `chelone.map.search_placeholder`. */
  placeholder?: string;
  /** Defaults to the `geocoder` of `MapsProvider`. One of the two is required. */
  provider?: GeocodingProvider;
  /** Shortest trimmed query that searches. Defaults to 3. */
  minChars?: number;
  /** Typeahead providers only: wait after the last key. Defaults to 300. */
  debounceMs?: number;
  countryCodes?: string[];
  viewBox?: LngLatBox;
  limit?: number;
  disabled?: boolean;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * A text field that searches an address with a geocoding provider and fills
 * the form with the result the user picks. A provider that allows typeahead
 * searches as the user types; any other searches on Enter or on the button.
 * Typed text reaches the form when the field loses focus, so an address no
 * provider finds can still be entered by hand, and clears `latSource`,
 * `lngSource` and `bboxSource` so they never describe a different address; a
 * pick writes the result's `displayName` and its coordinates.
 *
 * The list is a native `listbox` under a `combobox` input, since Vue's ui set
 * has no command component.
 *
 * @example
 * <GeocodingInput
 *   source="address"
 *   lat-source="latitude"
 *   lng-source="longitude"
 *   :provider="createNominatimProvider({ endpoint })"
 * />
 */

import { type GeocodeResult, textOf } from "@chelone/core";
import { computed, ref, useId, watch } from "vue";
import { useCheloneFormContext, useWrappedSource } from "../../form/form-context";
import { useInput } from "../../form/use-input";
import { useTranslate } from "../../i18n/use-translate";
import { cn } from "../../lib/utils";
import ValidationError from "../admin/common/validation-error.vue";
import FieldLabelText from "../admin/common/field-label-text.vue";
import { useMapsConfig } from "../maps/use-map";
import Button from "../ui/button.vue";
import { Field, FieldError, FieldLabel } from "../ui/field";
import Input from "../ui/input.vue";
import { useGeocode } from "./use-geocode";

const props = withDefaults(defineProps<GeocodingInputProps>(), {
  label: undefined,
  minChars: 3,
  debounceMs: 300,
  disabled: false,
});

const translate = useTranslate();
const config = useMapsConfig();
const typeahead = computed(
  () => (props.provider ?? config.geocoder)?.typeahead === true,
);

const { id, value, setValue, blur, error, touched, isRequired } = useInput({
  source: props.source,
});
const { form } = useCheloneFormContext();
const wrappedLat = props.latSource ? useWrappedSource(props.latSource) : null;
const wrappedLng = props.lngSource ? useWrappedSource(props.lngSource) : null;
const wrappedBbox = props.bboxSource
  ? useWrappedSource(props.bboxSource)
  : null;

const saved = computed(() => textOf(value.value));
const text = ref(saved.value);
// What the search runs on: typing sets it for a typeahead provider, Enter or the button for any other.
const query = ref("");
const open = ref(false);
const active = ref(-1);

// The form changed the address from outside (a reset, a reverse geocode).
watch(saved, (next) => {
  text.value = next;
});

const search = useGeocode(query, () => ({
  provider: props.provider,
  minChars: props.minChars,
  debounceMs: typeahead.value ? props.debounceMs : 0,
  countryCodes: props.countryCodes,
  viewBox: props.viewBox,
  limit: props.limit,
}));
const results = computed(() => search.data.value ?? []);
// Not `query` itself: a typeahead search runs on the debounced value, so a query
// that has reached `minChars` may not have started yet.
const searched = computed(
  () => search.isFetching.value || search.status.value !== "pending",
);
const listed = computed(() => open.value && searched.value);
const showsOptions = computed(
  () => listed.value && !search.isFetching.value && results.value.length > 0,
);

watch(results, () => {
  active.value = -1;
});

const listId = `${useId()}-listbox`;
const optionId = (index: number) => `${listId}-${index}`;

function onInput(next: string) {
  text.value = next;
  active.value = -1;
  if (typeahead.value) {
    query.value = next;
    open.value = true;
  } else {
    open.value = false;
  }
}

function runSearch() {
  // The same text keeps the same query key, which a failed search would never retry.
  if (query.value === text.value && search.isError.value) {
    void search.refetch();
  }
  query.value = text.value;
  open.value = true;
}

// A hand-typed address no longer matches the position of an earlier pick.
function writeTyped() {
  setValue(text.value);
  if (wrappedLat) form.ambient.setFieldValue(wrappedLat, null);
  if (wrappedLng) form.ambient.setFieldValue(wrappedLng, null);
  if (wrappedBbox) form.ambient.setFieldValue(wrappedBbox, null);
}

function pick(result: GeocodeResult) {
  setValue(result.displayName);
  text.value = result.displayName;
  if (wrappedLat) form.ambient.setFieldValue(wrappedLat, result.lat);
  if (wrappedLng) form.ambient.setFieldValue(wrappedLng, result.lng);
  if (wrappedBbox && result.bbox) {
    form.ambient.setFieldValue(wrappedBbox, [...result.bbox]);
  }
  open.value = false;
  active.value = -1;
}

function move(step: 1 | -1) {
  const count = results.value.length;
  if (count === 0) return;
  open.value = true;
  const current = active.value;
  // Nothing is highlighted yet, which is not the same as being before the
  // first option: each arrow lands on the end it points at.
  active.value =
    current < 0
      ? step === 1
        ? 0
        : count - 1
      : (current + step + count) % count;
}

// An option's mousedown is prevented, so a click on one never blurs the input.
function onBlur() {
  open.value = false;
  active.value = -1;
  if (text.value !== saved.value) writeTyped();
  blur();
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (!showsOptions.value && !open.value) return;
    event.preventDefault();
    move(event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Escape" && open.value) {
    event.stopPropagation();
    open.value = false;
    active.value = -1;
  } else if (event.key === "Enter") {
    // A search or a pick, not a form submit.
    event.preventDefault();
    const chosen = showsOptions.value ? results.value[active.value] : undefined;
    if (chosen) pick(chosen);
    else if (!typeahead.value) runSearch();
  }
}

const invalid = computed(() => touched.value && error.value != null);
const placeholderText = computed(
  () => props.placeholder ?? translate("chelone.map.search_placeholder"),
);
</script>

<template>
  <Field
    data-slot="geocoding-input"
    :data-invalid="invalid"
    :class="cn(props.class)"
  >
    <FieldLabel v-if="props.label !== false" :html-for="id">
      <FieldLabelText
        :label="props.label"
        :source="props.source" /><span v-if="isRequired"> *</span>
    </FieldLabel>
    <div class="relative">
      <div class="flex gap-2">
        <Input
          :id="id"
          role="combobox"
          autocomplete="off"
          aria-autocomplete="list"
          :aria-expanded="listed"
          :aria-controls="showsOptions ? listId : undefined"
          :aria-activedescendant="
            showsOptions && active >= 0 ? optionId(active) : undefined
          "
          :aria-label="
            props.label === false
              ? translate('chelone.map.search_placeholder')
              : undefined
          "
          :name="props.source"
          :model-value="text"
          :placeholder="placeholderText"
          :disabled="props.disabled"
          :aria-invalid="invalid"
          @update:model-value="onInput"
          @blur="onBlur"
          @keydown="onKeydown"
        />
        <Button
          v-if="!typeahead"
          type="button"
          variant="outline"
          :disabled="props.disabled"
          @click="runSearch"
        >
          {{ translate("chelone.map.search_button") }}
        </Button>
      </div>
      <div
        v-if="listed"
        class="absolute z-10 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md"
      >
        <p
          v-if="search.isFetching.value"
          role="status"
          class="px-2 py-3 text-sm text-muted-foreground"
        >
          {{ translate("chelone.map.searching") }}
        </p>
        <p
          v-else-if="search.isError.value"
          role="alert"
          class="px-2 py-3 text-sm text-muted-foreground"
        >
          {{ translate("chelone.map.search_failed") }}
        </p>
        <p
          v-else-if="results.length === 0"
          role="status"
          class="px-2 py-3 text-sm text-muted-foreground"
        >
          {{ translate("chelone.map.no_results") }}
        </p>
        <ul v-else :id="listId" role="listbox" class="max-h-64 overflow-auto p-1">
          <li
            v-for="(result, index) in results"
            :id="optionId(index)"
            :key="`${result.displayName}:${result.lat}:${result.lng}`"
            role="option"
            :aria-selected="index === active"
            :class="
              cn(
                'cursor-default rounded-sm px-2 py-1.5 text-sm',
                index === active && 'bg-accent text-accent-foreground',
              )
            "
            @mousedown.prevent
            @click="pick(result)"
          >
            <span class="flex flex-col">
              <span>{{ result.displayName }}</span>
              <span v-if="result.type" class="text-xs text-muted-foreground">
                {{ result.type }}
              </span>
            </span>
          </li>
        </ul>
      </div>
    </div>
    <FieldError v-if="invalid">
      <ValidationError :error="error" />
    </FieldError>
  </Field>
</template>
