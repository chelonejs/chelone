<script lang="ts">
import type { SearchInputProps } from "../inputs/search-input.vue";

/** Props for {@link FilterLiveSearch}: those of `<SearchInput>`. */
export type FilterLiveSearchProps = SearchInputProps;
</script>

<script setup lang="ts">
/**
 * `<FilterLiveSearch>` — a search box that keeps the ambient list's `q` filter
 * in sync as the user types, for a sidebar or a toolbar beside a list. The Vue
 * twin of `@chelone/react`'s `list/filter-live-search.tsx`. Takes the props of
 * `<SearchInput>`; `source` defaults to `q`. Vue has no separate
 * `FilterLiveForm`, so `<FilterForm>` is the live form around the input.
 *
 * @example
 * <FilterLiveSearch placeholder="Search posts" />
 */

import { useTranslate } from "../../../i18n/use-translate";
import SearchInput from "../inputs/search-input.vue";
import FilterForm from "./filter-form.vue";

const props = withDefaults(defineProps<FilterLiveSearchProps>(), {
  source: "q",
  placeholder: undefined,
});

const translate = useTranslate();
</script>

<template>
  <FilterForm>
    <SearchInput
      v-bind="props"
      :placeholder="props.placeholder ?? translate('chelone.action.search', { _: 'Search' })"
    />
  </FilterForm>
</template>
