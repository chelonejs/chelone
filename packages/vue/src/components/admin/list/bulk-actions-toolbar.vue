<script lang="ts">
/** Props for {@link BulkActionsToolbar}. */
export interface BulkActionsToolbarProps {
  label?: string;
}
</script>

<script setup lang="ts">
/**
 * `<BulkActionsToolbar>` — a sticky toolbar that appears when rows are selected
 * in a `<DataTable>`, the Vue analog of `@chelone/react`'s
 * `list/bulk-actions-toolbar.tsx`. Reads the ambient list surface
 * (`useListContext` — `selectedIds` + `unselectAll`), shows the selected-row
 * count + an unselect-all control, and renders any bulk-action slot content.
 * Hidden when nothing is selected.
 *
 * Chelone divergence (parity with the React twin): the default bulk buttons
 * (delete / export / select-all) live in a later button wave, so this toolbar
 * has NO default slot content — pass your own bulk buttons via the default slot,
 * or let `<DataTable :bulk-actions>` supply them. Labels resolve through the Vue
 * `useTranslate`, which honors the `{ _: fallback }` convention, so a missing
 * i18n message still renders readable English.
 */

import { computed } from "vue";
import { useTranslate } from "../../../i18n/use-translate";
import { useListContext } from "../../../list/list-context";
import { Card } from "../../ui/card";
import Button from "../../ui/button.vue";
import { XIcon } from "./list-icons";

defineProps<BulkActionsToolbarProps>();

const list = useListContext();
const translate = useTranslate();

const count = computed(() => list.selectedIds?.length ?? 0);
const visible = computed(() => count.value > 0);

const unselectLabel = computed(() =>
  translate("chelone.action.unselect", { _: "Unselect" }),
);
const countLabel = computed(() =>
  translate("chelone.action.bulk_actions", {
    smart_count: count.value,
    _: `${count.value} rows selected`,
  }),
);

function handleUnselectAll(event: MouseEvent) {
  event.stopPropagation();
  list.unselectAll();
}
</script>

<template>
  <Card
    v-if="visible"
    class="flex flex-col gap-2 md:gap-6 md:flex-row items-stretch sm:items-center p-2 px-4 w-[90%] sm:w-fit mx-auto fixed bottom-2 left-0 right-0 z-10 bg-muted"
    data-slot="bulk-actions-toolbar"
  >
    <div class="flex items-center gap-2">
      <Button
        variant="ghost"
        class="has-[>svg]:px-0"
        :aria-label="unselectLabel"
        @click="handleUnselectAll"
      >
        <XIcon />
      </Button>
      <span class="text-sm text-muted-foreground" data-slot="bulk-count">
        {{ label != null ? label : countLabel }}
      </span>
    </div>
    <slot />
  </Card>
</template>
