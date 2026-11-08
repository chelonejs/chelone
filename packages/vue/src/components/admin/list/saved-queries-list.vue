<script lang="ts">
/** Props for {@link SavedQueriesList}. */
export interface SavedQueriesListProps {
  /** Defaults to the ambient resource. */
  resource?: string;
  /** KV namespace for the saved queries. Default: the resource name. */
  storeKey?: string;
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<SavedQueriesList>` — named filter/sort sets of the ambient `<List>`, the Vue
 * analog of `@chelone/react`'s `list/saved-queries-list.tsx`. Apply one with a
 * click, save the current one under a name, remove one. Place it among the list
 * children.
 *
 * Chelone divergences from ra-core: no dialogs (the Vue package has no dialog
 * primitive), the name is typed into an inline form; only a list with a filter
 * set can be saved, so a sort-only query cannot.
 */

import {
  isSavedQueryActive,
  type SavedQueryValue,
  type TranslateParamValues,
} from "@chelone/core";
import { computed, ref, toRaw, watch } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { useRequiredResource } from "../../../resource-context";
import { useSavedQueries } from "../../../store/use-saved-queries";
import Button from "../../ui/button.vue";
import Input from "../../ui/input.vue";

const props = defineProps<SavedQueriesListProps>();

const resource = useRequiredResource("SavedQueriesList", {
  resource: props.resource,
});
const list = useListContext();
const translate = useTranslate();
const { queries, save, remove } = useSavedQueries(resource, {
  storeKey: props.storeKey,
});

const naming = ref(false);
const name = ref("");

// chelone's i18n returns the KEY when a message is not registered, so each
// label carries a local English fallback (as `ListPagination` does).
const t = (
  key: string,
  fallback: string,
  params: TranslateParamValues = {},
) => {
  const out = translate(key, params);
  return out === key ? fallback : out;
};

const removeLabel = (label: string) =>
  t(
    "chelone.saved_queries.remove_label_with_name",
    `Remove saved query "${label}"`,
    { name: label },
  );

// The list context is reactive; `save` clones its value, which a proxy rejects.
const current = computed<SavedQueryValue>(() => ({
  filter: toRaw(list.filter),
  displayedFilters: toRaw(list.displayedFilters),
  sort: toRaw(list.sort),
  perPage: list.perPage,
}));
const entries = computed(() =>
  queries.value.map((query) => ({
    ...query,
    active: isSavedQueryActive(query.value, current.value),
  })),
);
const canSave = computed(
  () =>
    Object.keys(list.filter).length > 0 &&
    !entries.value.some((entry) => entry.active),
);

function apply(value: SavedQueryValue, active: boolean) {
  if (active) {
    list.setParams({ filter: {} });
    return;
  }
  list.setParams({
    filter: value.filter,
    displayedFilters: value.displayedFilters,
    sort: value.sort,
    perPage: value.perPage,
  });
}

function closeForm() {
  naming.value = false;
  name.value = "";
}

// A form left open while the list stops being saveable would come back
// pre-filled once it is saveable again.
watch(canSave, (saveable) => {
  if (!saveable) closeForm();
});

function submit() {
  // The list may have changed while the form was open.
  if (!canSave.value || !name.value.trim()) return;
  save(name.value, current.value);
  closeForm();
}
</script>

<template>
  <div
    data-slot="saved-queries-list"
    :class="cn('flex flex-wrap items-center gap-2', props.class)"
  >
    <span
      v-for="query in entries"
      :key="query.label"
      class="inline-flex items-center"
    >
      <Button
        size="sm"
        :variant="query.active ? 'default' : 'outline'"
        :aria-pressed="query.active"
        @click="apply(query.value, query.active)"
      >
        {{ query.label }}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        :aria-label="removeLabel(query.label)"
        @click="remove(query.label)"
      >
        <span aria-hidden="true">×</span>
      </Button>
    </span>
    <form
      v-if="naming && canSave"
      class="flex items-center gap-2"
      @submit.prevent="submit"
    >
      <Input
        v-model="name"
        type="text"
        class="h-8 w-48"
        :aria-label="t('chelone.saved_queries.query_name', 'Query name')"
      />
      <Button type="submit" size="sm" :disabled="!name.trim()">
        {{ t("chelone.action.save", "Save") }}
      </Button>
      <Button variant="ghost" size="sm" @click="closeForm">
        {{ t("chelone.action.cancel", "Cancel") }}
      </Button>
    </form>
    <Button v-else-if="canSave" variant="outline" size="sm" @click="naming = true">
      {{ t("chelone.saved_queries.new_label", "Save current query") }}
    </Button>
  </div>
</template>
