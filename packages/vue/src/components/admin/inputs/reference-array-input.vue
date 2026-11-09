<script
  lang="ts"
  generic="
    TResources extends ResourceMap = RegisteredResources,
    TReference extends keyof TResources & string = keyof TResources & string
  "
>
import type {
  FilterPayload,
  RegisteredResources,
  ResourceMap,
  SortPayload,
  SourceProp,
} from "@chelone/core";

/** Props for {@link ReferenceArrayInput}. */
export interface ReferenceArrayInputProps<
  TResources extends ResourceMap = RegisteredResources,
  TReference extends keyof TResources & string = keyof TResources & string
> {
  /** The FK-array field on the current record (e.g. `"tag_ids"`). */
  source: SourceProp;
  /** The referenced resource choices are fetched from (e.g. `"tags"`). A registered resource name. */
  reference: TReference;
  /**
   * The field on the referenced record the values match. `"id"` (default)
   * resolves the selected records via `getMany`; any other key resolves them
   * via `getList({ filter: { [lookupKey]: values } })`.
   */
  lookupKey?: string;
  /** Permanent filter merged OVER the dynamic filter for every choices fetch. */
  filter?: FilterPayload;
  /** Sort applied to the choices query. */
  sort?: SortPayload;
  /** Choices page (1-based). */
  page?: number;
  /** Choices per page. */
  perPage?: number;
  /** Debounce delay (ms) for filter-driven choices refetches. */
  debounceMs?: number;
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
 * `<ReferenceArrayInput>` — edits a to-many foreign-key relationship with
 * autocompletion, the Vue analog of `@chelone/react`'s
 * `inputs/reference-array-input.tsx`. It fetches records from a reference
 * resource via {@link useReferenceInput} (the shared 4R choices controller) and
 * provides them — plus the reference resource context — to a child multi-select
 * input (default `<AutocompleteArrayInput>`, overridable via the default slot,
 * e.g. `<DatagridInput>`).
 *
 * The child consumes the choices via the ambient {@link provideChoicesContext}
 * and writes an id ARRAY back to the form (its own `useInput`); server-side
 * filtering flows through the context's `setFilters`. This wrapper syncs the
 * current FK-array value INTO the controller (`setValue`) so it resolves the
 * SELECTED records — the Vue analog of the React twin's `useWatch` + `useEffect`,
 * here a `useSubscribable` over `form.ambient.store` driving a `watch`.
 */

import { watch } from "vue";
import {
  provideChoicesContext,
  useReferenceInput,
} from "../../../choices";
import { useCheloneFormContext, useWrappedSource } from "../../../form";
import { subscribeStore, useSubscribable } from "../../../form/subscribe-ref";
import { provideResourceContext } from "../../../resource-context";
import AutocompleteArrayInput from "./autocomplete-array-input.vue";

const props = defineProps<
  ReferenceArrayInputProps<TResources, TReference>
>();

// Publish the reference resource so the child's record-representation /
// label-key resolution targets it.
provideResourceContext(props.reference);

const choicesContext = useReferenceInput({
  reference: props.reference,
  source: props.source,
  lookupKey: props.lookupKey,
  filter: props.filter,
  sort: props.sort,
  page: props.page,
  perPage: props.perPage,
  debounceMs: props.debounceMs,
});

// Expose the live choices context to the child multi-select below.
provideChoicesContext(choicesContext);

// Sync the current FK-array value on the form INTO the controller so it resolves
// the selected records. A `useSubscribable` over the form store reads the field
// value reactively (the Vue analog of RHF `useWatch`); writes flow the other way
// through the child's `useInput`.
const { form } = useCheloneFormContext();
const source = useWrappedSource(props.source);
const { store } = form.ambient;
const fieldValue = useSubscribable<unknown>({
  getSnapshot: () => form.ambient.getFieldValue(source),
  subscribe: (listener) => subscribeStore(store, listener),
});
watch(
  fieldValue,
  (value) => choicesContext.setValue(value ?? []),
  { immediate: true },
);
</script>

<template>
  <slot>
    <AutocompleteArrayInput />
  </slot>
</template>
