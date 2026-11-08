<script lang="ts">
import type { ArrayRow } from "@chelone/core";

/** Props for {@link ArrayInputRow}. */
export interface ArrayInputRowProps {
  /** The stable-id row this wrapper scopes + controls. */
  row: ArrayRow;
  /** Hides this row's remove and reorder controls. */
  disabled?: boolean;
  /** Hides the remove button. A function decides per row index. */
  disableRemove?: boolean | ((index: number) => boolean);
  /** Hides the move up / move down buttons. */
  disableReordering?: boolean;
  /** Lays the row's inputs out in one line from the `sm` breakpoint up. */
  inline?: boolean;
  /**
   * A label for the row. `true` numbers rows from 1; a function returns the
   * label for the row index; `false` renders none.
   */
  getItemLabel?: boolean | ((index: number) => string);
}
</script>

<script setup lang="ts">
/**
 * `<ArrayInputRow>` — one iterator row inside an `<ArrayInput>`, the chelone-native
 * analog of a `<SimpleFormIterator>` row. It scopes its slot children under the
 * row's `${arraySource}[${index}]` path via {@link provideIteratorRow} (so a
 * nested `<TextInput source="sku">` binds `items[0].sku`, and a sourceless scalar
 * child binds `tags[0]`), and renders remove + reorder controls wired to the
 * ambient array iterator ({@link ArrayInputContextKey}, provided by the parent
 * `<ArrayInput>`).
 *
 * Vue provide/inject is parent→child only, so this component provides the row
 * context for its SLOT descendants (the nested inputs) but reads the array
 * iterator from its ANCESTOR `<ArrayInput>` — it does not consume its own
 * provide. Keyed by `row.id` (not the index) in the parent so Vue reuses the
 * instance through reorders, preserving focus + DOM identity.
 *
 * The `#remove-button` and `#reorder-buttons` scoped slots (`{ index, remove,
 * reOrder }`) replace the default controls.
 */

import { computed, inject } from "vue";
import { ArrayInputContextKey, provideIteratorRow } from "../../../array";
import { useTranslate } from "../../../i18n/use-translate";
import Button from "../../ui/button.vue";

const props = defineProps<ArrayInputRowProps>();

// Scope slot children under this row's path (also provides IteratorRowContextKey).
provideIteratorRow(props.row);

const translate = useTranslate();

// Read the iterator from the ancestor <ArrayInput> (never our own provide).
const array = inject(ArrayInputContextKey, null);
if (!array) {
  throw new Error(
    "<ArrayInputRow>: no <ArrayInput> ancestor. Render rows inside an <ArrayInput>.",
  );
}

const removable = computed(() =>
  typeof props.disableRemove === "function"
    ? !props.disableRemove(props.row.index)
    : !props.disableRemove,
);
const itemLabel = computed(() =>
  typeof props.getItemLabel === "function"
    ? props.getItemLabel(props.row.index)
    : props.getItemLabel === true
      ? String(props.row.index + 1)
      : null,
);

function remove() {
  array?.remove(props.row.index);
}
function reOrder(to: number) {
  array?.reOrder(props.row.index, to);
}
function moveUp() {
  if (props.row.index > 0) array?.reOrder(props.row.index, props.row.index - 1);
}
function moveDown() {
  if (array && props.row.index < array.total.value - 1) {
    array.reOrder(props.row.index, props.row.index + 1);
  }
}
</script>

<template>
  <div data-slot="array-input-row" class="flex items-start gap-2">
    <span
      v-if="itemLabel != null"
      data-slot="array-input-row-label"
      class="min-w-6 pt-2 text-muted-foreground text-sm"
    >
      {{ itemLabel }}
    </span>
    <div
      class="flex flex-1 flex-col gap-2"
      :class="
        inline && 'sm:flex-row sm:items-start sm:[&>*]:min-w-0 sm:[&>*]:flex-1'
      "
    >
      <slot />
    </div>
    <div v-if="!disabled" class="flex shrink-0 items-center gap-1 pt-1">
      <template v-if="!disableReordering">
        <slot
          name="reorder-buttons"
          :index="row.index"
          :remove="remove"
          :re-order="reOrder"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-7"
            :disabled="row.index === 0"
            :aria-label="translate('chelone.action.move_up', { _: 'Move up' })"
            @click="moveUp"
          >
            <span aria-hidden="true">↑</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-7"
            :disabled="array != null && row.index >= array.total.value - 1"
            :aria-label="translate('chelone.action.move_down', { _: 'Move down' })"
            @click="moveDown"
          >
            <span aria-hidden="true">↓</span>
          </Button>
        </slot>
      </template>
      <template v-if="removable">
        <slot
          name="remove-button"
          :index="row.index"
          :remove="remove"
          :re-order="reOrder"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-7"
            :aria-label="translate('chelone.action.remove', { _: 'Remove' })"
            data-slot="array-input-remove"
            @click="remove"
          >
            <span aria-hidden="true">×</span>
          </Button>
        </slot>
      </template>
    </div>
  </div>
</template>
