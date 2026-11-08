<script lang="ts">
/** Props for {@link SearchInput}. */
export interface SearchInputProps {
  source?: SourceProp;
  label?: string | false;
  disableClearable?: boolean;
  defaultValue?: string;
  validate?: Validator | readonly Validator[];
  placeholder?: string;
  inputClass?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SearchInput>` — an unlabelled text input with a search icon, the Vue analog
 * of `@chelone/react`'s `inputs/search-input.tsx`. Designed for filter bars, it
 * defaults to the `q` full-text source. Reads the live value off the ambient
 * form store and clears via `form.ambient.setFieldValue`. It throws if given a `label`
 * (use `<TextInput>` when a label is needed) — mirroring the React twin.
 */

import type { SourceProp, Validator } from "@chelone/core";
import { computed } from "vue";
import { useCheloneFormContext, useWrappedSource } from "../../../form/form-context";
import { subscribeStore, useSubscribable } from "../../../form/subscribe-ref";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import Button from "../../ui/button.vue";
import TextInput from "./text-input.vue";

const props = withDefaults(
  defineProps<SearchInputProps>(),
  { source: "q", disableClearable: false },
);

if (props.label) {
  throw new Error(
    "<SearchInput> isn't designed to be used with a label prop. Use <TextInput> if you need a label.",
  );
}

const translate = useTranslate();
const { form } = useCheloneFormContext();
const wrappedSource = useWrappedSource(props.source);

const formState = useSubscribable({
  getSnapshot: () => form.ambient.store.state,
  subscribe: (cb) => subscribeStore(form.ambient.store, cb),
});
const hasValue = computed(() => {
  void formState.value;
  const v = form.ambient.getFieldValue(wrappedSource);
  return v != null && v !== "";
});

const showClearButton = computed(
  () => !props.disableClearable && hasValue.value,
);
const searchPlaceholder = computed(
  () => props.placeholder ?? translate("chelone.action.search", { _: "Search" }),
);
const clearLabel = computed(() =>
  translate("chelone.action.clear_search", { _: "Clear search" }),
);

function handleClear() {
  form.ambient.setFieldValue(wrappedSource, "");
}
</script>

<template>
  <div class="relative mt-auto flex grow">
    <TextInput
      :source="source"
      :label="false"
      :default-value="defaultValue"
      :validate="validate"
      :placeholder="searchPlaceholder"
      :class="cn('grow', props.class)"
      :input-class="cn(showClearButton ? 'pr-16' : 'pr-8', inputClass)"
    />
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 size-4 text-muted-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
    <Button
      v-if="showClearButton"
      data-slot="clear-search"
      type="button"
      variant="ghost"
      size="sm"
      :class="'-translate-y-1/2 absolute top-1/2 right-8 size-6 rounded-full p-0 text-muted-foreground'"
      :aria-label="clearLabel"
      @click="handleClear"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="size-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </Button>
  </div>
</template>
