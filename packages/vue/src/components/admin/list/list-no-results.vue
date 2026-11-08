<script lang="ts">
/** Props for {@link ListNoResults}. */
export interface ListNoResultsProps {
  class?: string;
}
</script>

<script setup lang="ts">
/**
 * `<ListNoResults>` — the empty state of a list, the Vue analog of
 * `@chelone/react`'s `list/list-no-results.tsx`. Under an active filter it says
 * so and offers to clear it.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { cn } from "../../../lib/utils";
import { useListContext } from "../../../list/list-context";
import { useResourceContext } from "../../../resource-context";
import Button from "../../ui/button.vue";

const props = defineProps<ListNoResultsProps>();

const translate = useTranslate();
const resource = useResourceContext();
const list = useListContext();
if (!resource) {
  throw new Error("<ListNoResults> must be used inside a <List> component");
}

// chelone's i18n echoes a missing key, so each message passes its fallback.
const filtered = computed(() => Object.keys(list.filter ?? {}).length > 0);
</script>

<template>
  <div
    :class="cn('flex flex-col items-center gap-2 p-6 text-center text-sm', props.class)"
  >
    <p class="text-muted-foreground">
      {{
        filtered
          ? translate("chelone.navigation.no_filtered_results", {
              _: "No results found with the current filters.",
            })
          : translate("chelone.navigation.no_results", { _: "No results found" })
      }}
    </p>
    <Button v-if="filtered" variant="outline" size="sm" @click="list.setFilters({}, {})">
      {{ translate("chelone.navigation.clear_filters", { _: "Clear filters" }) }}
    </Button>
  </div>
</template>
